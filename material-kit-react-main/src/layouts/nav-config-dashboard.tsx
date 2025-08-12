import { Label } from 'src/components/label';
import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => <SvgColor src={`/assets/icons/navbar/${name}.svg`} />;

export type NavItem = {
  title: string;
  path: string;
  icon: React.ReactNode;
  info?: React.ReactNode;
};

export const navData = [
  {
    title: 'Quotations', // Changed from Dashboard
    path: '/quotations', // Path to show all quotations
    icon: icon('ic-analytics'), // You can choose a more fitting icon if you have one, or keep this
  },
  {
    title: 'Create Quotation', // Changed from User
    path: '/quotations/create', // Path to the create quotation page
    icon: icon('ic-user'), // You can choose a more fitting icon, or keep this
  },
  {
    title: 'Product', // KEPT THIS
    path: '/products', // KEPT THIS
    icon: icon('ic-cart'), // KEPT THIS
    info: (
      <Label color="error" variant="inverted">
        +3
      </Label>
    ),
  },
  {
    title: 'Blog', // KEPT THIS
    path: '/companies', // KEPT THIS
    icon: icon('ic-blog'), // KEPT THIS
  },
  {
    title: 'Sign in', // KEPT THIS
    path: '/sign-in', // KEPT THIS
    icon: icon('ic-lock'), // KEPT THIS
  },
  {
    title: 'Not found', // KEPT THIS
    path: '/404', // KEPT THIS
    icon: icon('ic-disabled'), // KEPT THIS
  },
];