//使用path需要按照@types/node依赖
import path from 'path'

/**
 * 获取项目根路径
 * @descrition 末尾不带斜杠
 */
export const getRootPath = () => {
  return path.resolve(__dirname, process.cwd())
}

/**
 * 获取项目主路径 如(src)
 * @param mainName - src目录名称(默认: "src")
 * @descrition 末尾不带斜杠
 */
export const getSrcPath = (mainName = 'src') => {
  const rootPath = getRootPath()
  return `${rootPath}/${mainName}`
}
