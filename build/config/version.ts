import pkg from '../../package.json'

/** npm依赖包版本信息 */
export interface PkgVersionInfo {
  name: string
  version: string
}

interface Package {
  name: string
  version: string
  author: Record<string, string>
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  [key: string]: any
}

interface PkgJson {
  name: string
  version: string
  author: Record<string, string>
  dependencies: PkgVersionInfo[]
  devDependencies: PkgVersionInfo[]
}

const pkgWithType = pkg as Package

const transformVersionData = (tuple: [string, string]): PkgVersionInfo => {
  const [name, version] = tuple
  return {
    name,
    version
  }
}

export const pkgJson: PkgJson = {
  name: pkgWithType.name,
  version: pkgWithType.version,
  author: pkgWithType.author,
  dependencies: Object.entries(pkgWithType.dependencies).map((item) => transformVersionData(item)),
  devDependencies: Object.entries(pkgWithType.devDependencies).map((item) => transformVersionData(item))
}
