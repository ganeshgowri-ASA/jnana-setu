import type { License } from "@data/schema";

export const LICENSE_LABELS: Record<License, string> = {
  "CC-BY-4.0": "CC BY 4.0",
  "CC-BY-SA-4.0": "CC BY-SA 4.0",
  "CC-BY-NC-4.0": "CC BY-NC 4.0",
  "CC-BY-NC-SA-4.0": "CC BY-NC-SA 4.0",
  "CC0-1.0": "CC0 1.0",
  "Public-Domain": "Public Domain",
  "GoI-Open-Data": "Govt. of India — Open Data",
  "Official-Free-Access": "Official free-access release",
};

export const LICENSE_URLS: Partial<Record<License, string>> = {
  "CC-BY-4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC-BY-SA-4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  "CC-BY-NC-4.0": "https://creativecommons.org/licenses/by-nc/4.0/",
  "CC-BY-NC-SA-4.0": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  "CC0-1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
  "GoI-Open-Data": "https://data.gov.in/government-open-data-license-india",
};

export function licenseLabel(id: License): string {
  return LICENSE_LABELS[id] ?? id;
}

export function licenseHref(id: License, override?: string): string | undefined {
  return override ?? LICENSE_URLS[id];
}
