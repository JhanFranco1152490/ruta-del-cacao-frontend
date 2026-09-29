import { AssociationAccessCard } from '@/features/association-access/components/association-access-card';
import { AccountListScreen } from '@/features/users/components/account-list-screen';
export default function UsersPage() {
  return <AccountListScreen accessCard={<AssociationAccessCard />} />;
}
