import { TauriCommand } from '@/enums'
import { invokeWithErrorHandler } from '@/utils/TauriInvokeHandler'

// Add the enum entry in src/enums/index.ts before using this command.
export const exampleCommand = async (payload: string): Promise<string> => {
  return await invokeWithErrorHandler<string>(TauriCommand.EXAMPLE_COMMAND, { payload })
}
