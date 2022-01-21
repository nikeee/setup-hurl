import * as tc from "@actions/tool-cache";
import * as core from "@actions/core";
import * as httpm from "@actions/http-client";
import * as semver from "semver";
import * as sys from "./system";
import os from "os";
import path from "path";

type ReleasesResponse = GhRelease[];
interface GhRelease {
  url: string;
  tag_name: string;
  assets: GhReleaseAsset[];
}
interface GhReleaseAsset {
  name: string;
  browser_download_url: string;
  content_type: string;
}

export async function getHurl(versionSpec: string) {
  const osPlat: string = os.platform();
  const osArch: string = os.arch();

  // check cache
  const toolPath = tc.find("hurl", versionSpec);
  // If not found in cache, download
  if (toolPath) {
    core.info(`Found in cache @ ${toolPath}`);
    return toolPath;
  }

  core.info(`Attempting to download ${versionSpec}...`);

  const foundReleaseData = await findMatchingHurlRelease(versionSpec);
  if (!foundReleaseData) {
    core.error(`Could not find a hurl version matching ${versionSpec}`);
    return;
  }
  const [release, asset] = foundReleaseData;
  const downloadPath = await installHurlVersion(release, asset);
  return downloadPath;
}

async function installHurlVersion(release: GhRelease, info: GhReleaseAsset): Promise<string> {
  core.info(`Acquiring ${info.name} from ${info.browser_download_url}`);
  const downloadPath = await tc.downloadTool(info.browser_download_url, undefined);

  core.info("Extracting Hurl...");
  const extPath = await extractHurlArchive(downloadPath);
  core.info(`Successfully extracted hurl to ${extPath}`);

  const binaryPath = path.join(extPath, "hurl-" + release.tag_name);

  core.info("Adding to the cache ...");
  const cachedDir = await tc.cacheDir(
    binaryPath,
    "hurl",
    release.tag_name,
  );
  core.info(`Successfully cached hurl to ${cachedDir}`);
  return cachedDir;
}

export async function extractHurlArchive(archivePath: string): Promise<string> {
  // archivePath does not contain a file extension, so we have to rely on the architecture always use the same file type
  return os.platform() === "win32"
    ? await tc.extractZip(archivePath)
    : await tc.extractTar(archivePath)
}


export async function findMatchingHurlRelease(versionSpec: string): Promise<[GhRelease, GhReleaseAsset] | undefined> {
  const platFilter = sys.getPlatform();
  const archFilter = platFilter === "win64"
    ? "win64" // treat windows as arch here, since there is no x86_64 in the file name
    : sys.getArch();

  const releases = await getAvailableVersions();
  if (releases === undefined || releases.length === 0) {
    return undefined;
  }

  if (versionSpec.toLowerCase() === "latest") {
    const release = releases[0];
    console.log("Returning: " + releases[0].tag_name);
    const matchingAsset = findMatchingAsset(platFilter, archFilter, release);
    if (matchingAsset) {
      return [release, matchingAsset];
    }
    core.error(`"${versionSpec}" was not available for current arch/platform combination: ${archFilter}/${platFilter}`);
    return undefined;
  }

  for (const release of releases) {
    const version = release.tag_name;
    if (semver.satisfies(version, versionSpec)) {
      const matchingAsset = findMatchingAsset(platFilter, archFilter, release);
      if(matchingAsset) {
        return [release, matchingAsset];
      }
    }
  }

  core.error(`"${versionSpec}" was not available for current arch/platform combination: ${archFilter}/${platFilter}`);
  return undefined; // No match
}

function findMatchingAsset(platFilter: string, archFilter: string, release: GhRelease): GhReleaseAsset | undefined {
  for (const asset of release.assets) {
    if (asset.name.includes(platFilter) && asset.name.includes(archFilter)) {
      return asset;
    }
  }
  return undefined;
}


export async function getAvailableVersions(): Promise<ReleasesResponse | undefined> {
  // this returns versions descending so latest is first
  const http = new httpm.HttpClient("setup-hurl", [], {
    allowRedirects: true,
    maxRedirects: 3
  });
  const url = "https://api.github.com/repos/Orange-OpenSource/hurl/releases";
  const res = (await http.getJson<ReleasesResponse>(url)).result;

  return res
    ? res.sort((a, b) => semver.compare(b.tag_name, a.tag_name))
    : undefined;
}
