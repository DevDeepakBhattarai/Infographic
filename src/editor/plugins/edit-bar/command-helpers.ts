import type { Element } from '../../../types';
import { UpdateElementCommand } from '../../commands';
import type { ElementProps, ICommand, ICommandManager } from '../../types';
import type { EditBarCommandHelpers } from './types';

/**
 * Create command helper functions for use in custom edit bar items.
 * These helpers simplify creating and executing commands for common operations.
 *
 * @param commander The command manager instance
 * @returns Helper functions for creating and executing commands
 */
export function createCommandHelpers(
  commander: ICommandManager,
): EditBarCommandHelpers {
  return {
    updateElement: (
      element: Element,
      props: Partial<ElementProps>,
    ): ICommand => {
      return new UpdateElementCommand(element, props);
    },

    execute: async (command: ICommand): Promise<void> => {
      await commander.execute(command);
    },

    executeBatch: async (commands: ICommand[]): Promise<void> => {
      await commander.executeBatch(commands);
    },
  };
}
