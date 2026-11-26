import { AsyncButton } from '../../ui/AsyncButton';
import { Icon } from '../../ui/Icon';
import { useAnnounce } from '../../ui/Status';

/**
 * Sign out, from anywhere it is placed: the foot of the side menu, the Settings list on phones, Account.
 * This device keeps its data, and the app goes back to the sign-in screen. The account code loads on press.
 */
export function SignOutButton({ className }: { className: string }) {
  const announce = useAnnounce();
  return (
    <AsyncButton
      className={className}
      onClick={async () => {
        await (await import('../../sync/auth')).signOut();
        announce('Signed out');
      }}
    >
      <Icon name="sign-out" size={18} />
      Sign out
    </AsyncButton>
  );
}
