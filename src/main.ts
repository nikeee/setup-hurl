import * as core from "@actions/core";
import * as io from "@actions/io";
import * as installer from "./installer";
import cp from "child_process";

export async function run() {
  try {
    // versionSpec is optional. If supplied, install / use from the tool cache.
    // If not supplied, "latest" will be used.
    const versionSpec = core.getInput("hurl-version") || "latest";

    core.info(`Setup hurl version spec ${versionSpec}`);

    const installDir = await installer.getHurl(versionSpec);
    if(!installDir) {
      core.error("Could not fetch hurl");
      return;
    }

    core.addPath(installDir);
    core.info("Added hurl to the path");
    core.info(`Successfully setup hurl version ${versionSpec}`);

    // output the version actually being used
    const hurlPath = await io.which("hurl");
    const hurlVersion = (cp.execSync(`${hurlPath} --version`) || "").toString();
    core.info(hurlVersion);

  } catch (error: any) {
    core.setFailed(error.message);
  }
}
