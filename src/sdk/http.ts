import { request } from "undici";
import { z } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    public readonly body: unknown,
    message?: string,
  ) {
    super(message ?? `HTTP ${status} ${url}`);
    this.name = "HttpError";
  }
}

export interface HttpClientOptions {
  baseUrl: string;
  token?: string;
  /** Custom fetch (used for tests with msw / fetch-mock). When provided, undici is bypassed. */
  fetchImpl?: typeof fetch;
  defaultHeaders?: Record<string, string>;
}

export interface RequestInit {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
}

export class HttpClient {
  constructor(private readonly opts: HttpClientOptions) {}

  private url(path: string, query?: RequestInit["query"]): string {
    const u = new URL(path.replace(/^\//, ""), this.opts.baseUrl.replace(/\/?$/, "/"));
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) u.searchParams.set(k, String(v));
      }
    }
    return u.toString();
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    const h: Record<string, string> = {
      "content-type": "application/json",
      accept: "application/json",
      ...this.opts.defaultHeaders,
      ...extra,
    };
    if (this.opts.token) h.authorization = `Bearer ${this.opts.token}`;
    return h;
  }

  async raw<S extends z.ZodTypeAny>(
    path: string,
    init: RequestInit,
    schema: S,
  ): Promise<z.output<S>> {
    const url = this.url(path, init.query);
    const headers = this.headers(init.headers);
    const body = init.body === undefined ? undefined : JSON.stringify(init.body);

    let status: number;
    let text: string;

    if (this.opts.fetchImpl) {
      const res = await this.opts.fetchImpl(url, { method: init.method ?? "GET", headers, body });
      status = res.status;
      text = await res.text();
    } else {
      const res = await request(url, { method: init.method ?? "GET", headers, body });
      status = res.statusCode;
      text = await res.body.text();
    }

    const parsed = text ? safeJson(text) : undefined;
    if (status < 200 || status >= 300) {
      throw new HttpError(status, url, parsed ?? text);
    }
    return schema.parse(parsed) as z.output<S>;
  }

  get<S extends z.ZodTypeAny>(path: string, schema: S, query?: RequestInit["query"]): Promise<z.output<S>> {
    return this.raw(path, { method: "GET", query }, schema);
  }
  post<S extends z.ZodTypeAny>(path: string, body: unknown, schema: S): Promise<z.output<S>> {
    return this.raw(path, { method: "POST", body }, schema);
  }
  patch<S extends z.ZodTypeAny>(path: string, body: unknown, schema: S): Promise<z.output<S>> {
    return this.raw(path, { method: "PATCH", body }, schema);
  }
  put<S extends z.ZodTypeAny>(path: string, body: unknown, schema: S): Promise<z.output<S>> {
    return this.raw(path, { method: "PUT", body }, schema);
  }
  del<S extends z.ZodTypeAny>(path: string, schema: S): Promise<z.output<S>> {
    return this.raw(path, { method: "DELETE" }, schema);
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
