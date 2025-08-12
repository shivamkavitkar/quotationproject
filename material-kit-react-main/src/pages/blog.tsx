import { CONFIG } from 'src/config-global';

// Import from the new 'address' section
import CompaniesView from 'src/sections/address';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      {/* Update the title */}
      <title>{`Companies - ${CONFIG.appName}`}</title>

      {/* Use the new component */}
      <CompaniesView />
    </>
  );
}