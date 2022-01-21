import * as os from "os";

export function getPlatform(): string {
  const plat: string = os.platform();
  return plat === "win32"
    ? "win64"
    : plat === "darwin"
      ? "osx"
      : plat;
}

export function getArch(): string {
  const arch: string = os.arch();

  // Actually we only support x86_64, but we try to do it similar to setup-go
  switch (arch) {
    case "x64": return "x86_64";
    default: return arch;
  }
}
