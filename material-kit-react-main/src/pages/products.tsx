import { CONFIG } from 'src/config-global';

import { ProductsView } from 'src/sections/product/view';

// ----------------------------------------------------------------------

// App.js se toggleSidebar prop ProductsView mein bhejna hai
// Toh Page component ko bhi toggleSidebar prop chahiye App.js se.
// Abhi App.js mein seedhe <ProductTable /> render ho raha hai,
// toh hum ProductsView ko aise use nahi kar payenge.
// Humein ProductTable wali file mein ProductTable component ko hi ProductsView banana padega
// aur usko App.js se toggleSidebar prop milna chahiye.

// Pichle conversations ke hisaab se, ProductsView hi ab aapka ProductTable hai.
// Aur is file (products.tsx) ka kaam bas ProductsView ko render karna hai.
// Toh, is file ko App.js se toggleSidebar prop milna chahiye.

// Yeh error tab aata hai jab aap App.js mein ProductsView ko direct render karte hain,
// lekin ProductsView ko toggleSidebar prop chahiye.

// Is error ko theek karne ke liye, `products.tsx` file ko is tarah se modify karein:

export default function Page({ toggleSidebar }: { toggleSidebar: () => void }) { // toggleSidebar prop yahan add karein
  return (
    <>
      <title>{`Products - ${CONFIG.appName}`}</title>
      {/* Ab ProductsView ko toggleSidebar prop bhejein */}
      <ProductsView toggleSidebar={toggleSidebar} />
    </>
  );
}