# training-nft-2

Training n°2 for NFT marketplace

![https://img.etimg.com/thumb/msid-71286763,width-1070,height-580,overlay-economictimes/photo.jpg](https://img.etimg.com/thumb/msid-71286763,width-1070,height-580,overlay-economictimes/photo.jpg)

This time we are gone add the ability to buy and sell NFT at a price

# :arrow_forward: Go forward

Keep your code from previous training or get the solution [here](https://github.com/marigold-dev/training-nft-1/tree/main/solution)

> If you clone/fork a repo, rebuild in local

```bash
npm i
cd ./app
yarn install
cd ..
```

# :scroll: Smart contract

Add these code sections on your `nft.jsligo` smart contract

```jsligo

type offer = {
  owner : address,
  price : nat
};

type storage =
  {
...
    offers: map<nat,offer>,  //user sells an offer
...
  };

...

type parameter =
...
  | ["Buy", nat, address]  //buy token_id at a seller offer price
  | ["Sell", nat, nat]  //sell token_id at a price
...

const main = ([p, s]: [parameter,storage]): ret =>
...
     Buy: (p : [nat,address]) => [list([]),s],
     Sell: (p : [nat,nat]) => [list([]),s],
...
```

Explanations :

- an `offer` is a nft sale at a price owned by someone
- `storage` has a new field to support `offers`, a map of offers for each nft sold by an owner
- `parameter` has more entrypoints for selling/buying `(Sell,Buy)`
- `main` function exposes the new entrypoints

Update also the initial storage on file `nft.storages.jsligo`

```jsligo
...
    offers: Map.empty as map<nat,offer>,
...
```

Compile the contract

```bash
TAQ_LIGO_IMAGE=ligolang/ligo:0.56.0 taq compile nft.jsligo
```

## :credit_card: Sell at an offer price

Let's add the `sell` function. Edit the code sections as below

```jsligo
...

const sell = (token_id : nat,price: nat, s: storage) : ret => {

  //check balance of seller
  const sellerBalance = NFT.Storage.get_balance({ledger:s.ledger,metadata:s.metadata,operators:s.operators,token_metadata:s.token_metadata,token_ids : s.token_ids},Tezos.get_source(),token_id);
  if(sellerBalance != (1 as nat)) return failwith("2");

  //need to allow the contract itself to be an operator on behalf of the seller
  const newOperators = NFT.Operators.add_operator(s.operators,Tezos.get_source(),Tezos.get_self_address(),token_id);

  //DECISION CHOICE: if offer already exists, we just override it
  return [list([]) as list<operation>,{...s,offers:Map.add(token_id,{owner : Tezos.get_source(), price : price},s.offers),operators:newOperators}];
};

...

const main = ([p, s]: [parameter,storage]): ret =>
...
     Sell: (p : [nat,nat]) => sell(p[0],p[1], s),
...

```

Explanations :

- first, we check the balance of the seller, he should have enough token to place an offer
- the seller will set the nft marketplace smartcontract as operator. The reason is while the buyer will send his money to buy the NFT, the smartcontract will change the nft ownership (it is not interactive with the seller, the martketplace will do it on behalf of the seller based on the offer data)
- we update the storage to publish the offer
- adding the call to `sell` function on `main` function is straightforward

## :credit_card: Buy a bottle on the market

Now that we have offers on the market, we are able to buy bottles

Edit the smart contract to add this feature, as below

```jsligo
...

const buy = (token_id : nat, seller: address, s: storage) : ret => {

  //search for the offer
  return match( Map.find_opt(token_id,s.offers) , {
    None : () => failwith("3"),
    Some : (offer : offer) => {

      //check if amount have been paid enough
      if(Tezos.get_amount() < offer.price  * (1 as mutez)) return failwith("5");

      // prepare transfer of XTZ to seller
      const op = Tezos.transaction(unit,offer.price  * (1 as mutez),Tezos.get_contract_with_error(seller,"6"));

      //transfer tokens from seller to buyer
      const ledger = NFT.Ledger.transfer_token_from_user_to_user(s.ledger,token_id,seller,Tezos.get_source());

      //remove offer
      return [list([op]) as list<operation>, {...s, offers : Map.update(token_id,None(),s.offers), ledger : ledger}];
    }
  });
};

...

const main = ([p, s]: [parameter,storage]): ret =>
...
     Buy: (p : [nat,address]) => buy(p[0],p[1],s),
...
```

Explanations :

- first, we search for the offer based on the token_id, if it does not exist, we return an error
- we check that the amount sent by the buyer is at least equal to the offer price
- if it is ok, then we transfer the offer price to the seller and we transfer the nft to the buyer
- finally we remove the offer as it has been executed
- adding the call to `buy` function on `main` function is straightforward

## Compile and deploy

We have finished the smart contract implementation for this second training, let's prepare the deployment to ghostnet.

Deploy to ghostnet

```bash
taq deploy nft.tz -e "testing"
```

```logs
┌──────────┬──────────────────────────────────────┬───────┬──────────────────┬────────────────────────────────┐
│ Contract │ Address                              │ Alias │ Balance In Mutez │ Destination                    │
├──────────┼──────────────────────────────────────┼───────┼──────────────────┼────────────────────────────────┤
│ nft.tz   │ KT1F9EV54K7hRgwJKEyq5bxJokr8bTkYyC16 │ nft   │ 0                │ https://ghostnet.ecadinfra.com │
└──────────┴──────────────────────────────────────┴───────┴──────────────────┴────────────────────────────────┘
```

:tada: Hooray ! We have finished the backend :tada:

# :performing_arts: NFT Marketplace front

Generate Typescript classes and go to the frontend to run the server

```bash
taq generate types ./app/src
cd ./app
yarn run start
```

## Create the Sale page

Create the Sale Page

```bash
touch ./src/OffersPage.tsx
```

Add this code inside the created file :

```typescript
import SellIcon from "@mui/icons-material/Sell";
import {
  Avatar,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  TextField,
} from "@mui/material";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import BigNumber from "bignumber.js";
import { useFormik } from "formik";
import { useSnackbar } from "notistack";
import React, { Fragment, useEffect } from "react";
import * as yup from "yup";
import { UserContext, UserContextType } from "./App";
import { TransactionInvalidBeaconError } from "./TransactionInvalidBeaconError";
import { address, nat } from "./type-aliases";

const validationSchema = yup.object({
  price: yup
    .number()
    .required("Price is required")
    .positive("ERROR: The number must be greater than 0!"),
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

type Offer = {
  owner: address;
  price: nat;
};

export default function OffersPage() {
  const [selectedTokenId, setSelectedTokenId] = React.useState<number>(0);

  let [offersTokenIDMap, setOffersTokenIDMap] = React.useState<Map<nat, Offer>>(
    new Map()
  );
  let [ownerTokenIds, setOwnerTokenIds] = React.useState<Set<nat>>(new Set());

  const {
    nftContrat,
    nftContratTokenMetadataMap,
    userAddress,
    storage,
    refreshUserContextOnPageReload,
  } = React.useContext(UserContext) as UserContextType;

  const { enqueueSnackbar } = useSnackbar();

  const formik = useFormik({
    initialValues: {
      price: 0,
    },
    validationSchema: validationSchema,
    onSubmit: (values) => {
      console.log("onSubmit: (values)", values, selectedTokenId);
      sell(selectedTokenId, values.price);
    },
  });

  const initPage = async () => {
    if (storage) {
      console.log("context is not empty, init page now");
      ownerTokenIds = new Set();
      offersTokenIDMap = new Map();

      await Promise.all(
        storage.token_ids.map(async (token_id) => {
          let owner = await storage.ledger.get(token_id);
          if (owner === userAddress) {
            ownerTokenIds.add(token_id);

            const ownerOffers = await storage.offers.get(token_id);
            if (ownerOffers) offersTokenIDMap.set(token_id, ownerOffers);

            console.log(
              "found for " +
                owner +
                " on token_id " +
                token_id +
                " with balance " +
                1
            );
          } else {
            console.log("skip to next token id");
          }
        })
      );
      setOwnerTokenIds(new Set(ownerTokenIds)); //force refresh
      setOffersTokenIDMap(new Map(offersTokenIDMap)); //force refresh
    } else {
      console.log("context is empty, wait for parent and retry ...");
    }
  };

  useEffect(() => {
    (async () => {
      console.log("after a storage changed");
      await initPage();
    })();
  }, [storage]);

  useEffect(() => {
    (async () => {
      console.log("on Page init");
      await initPage();
    })();
  }, []);

  const sell = async (token_id: number, price: number) => {
    try {
      const op = await nftContrat?.methods
        .sell(
          BigNumber(token_id) as nat,
          BigNumber(price * 1000000) as nat //to mutez
        )
        .send();

      await op?.confirmation(2);

      enqueueSnackbar(
        "Wine collection (token_id=" +
          token_id +
          ") offer for " +
          1 +
          " units at price of " +
          price +
          " XTZ",
        { variant: "success" }
      );

      refreshUserContextOnPageReload(); //force all app to refresh the context
    } catch (error) {
      console.table(`Error: ${JSON.stringify(error, null, 2)}`);
      let tibe: TransactionInvalidBeaconError =
        new TransactionInvalidBeaconError(error);
      enqueueSnackbar(tibe.data_message, {
        variant: "error",
        autoHideDuration: 10000,
      });
    }
  };

  return (
    <Box
      component="main"
      sx={{
        flex: 1,
        py: 6,
        px: 4,
        bgcolor: "#eaeff1",
        backgroundImage:
          "url(https://en.vinex.market/skin/default/images/banners/home/new/banner-1180.jpg)",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <Paper sx={{ maxWidth: 936, margin: "auto", overflow: "hidden" }}>
        {ownerTokenIds && ownerTokenIds.size != 0 ? (
          Array.from(ownerTokenIds).map((token_id) => (
            <Card key={userAddress + "-" + token_id.toString()}>
              <CardHeader
                avatar={
                  <Avatar sx={{ bgcolor: "purple" }} aria-label="recipe">
                    {token_id.toString()}
                  </Avatar>
                }
                title={
                  nftContratTokenMetadataMap.get(token_id.toNumber())?.name
                }
              />

              <CardContent>
                {offersTokenIDMap.get(token_id) ? (
                  <div>
                    {"Offer : " +
                      1 +
                      " at price " +
                      offersTokenIDMap.get(token_id)?.price.dividedBy(1000000) +
                      " XTZ/bottle"}
                  </div>
                ) : (
                  ""
                )}
              </CardContent>

              <CardActions disableSpacing>
                <form
                  onSubmit={(values) => {
                    setSelectedTokenId(token_id.toNumber());
                    formik.handleSubmit(values);
                  }}
                >
                  <TextField
                    name="price"
                    label="price/bottle (XTZ)"
                    placeholder="Enter a price"
                    variant="standard"
                    type="number"
                    value={formik.values.price}
                    onChange={formik.handleChange}
                    error={formik.touched.price && Boolean(formik.errors.price)}
                    helperText={formik.touched.price && formik.errors.price}
                  />
                  <Button type="submit" aria-label="add to favorites">
                    <SellIcon /> SELL
                  </Button>
                </form>
              </CardActions>
            </Card>
          ))
        ) : (
          <Fragment />
        )}
      </Paper>
    </Box>
  );
}
```

Explanations :

- the template will display all owned NFTs. Only NFTs belonging to the logged user are selected
- for each nft, we have a form to make an offer at a price
- if you do an offer, it calls the `sell` function and the smart contract entrypoint `nftContrat?.methods.sell(BigNumber(token_id) as nat,BigNumber(price * 1000000) as nat).send()`. We multiply the XTZ price by 10^6 because the smartcontract manipulates mutez.

## Update the navigation

Update routes on the `./src/Paperbase.tsx` file.
Import the Offerspage at the beginning of the file.

```typescript
import OffersPage from "./OffersPage";
```

and at the end of the file, just add this line after `<Route index element={<Welcome />} />`

```typescript
<Route path={PagesPaths.OFFERS} element={<OffersPage />} />
```

## Update the menu bar on the left

Edit `Navigator.tsx` file to add an effect if the nft collection is not empty, we display a new menu entry

```typescript
...
import React, { useEffect, useState } from "react";
import SellIcon from "@mui/icons-material/Sell";
...

useEffect(() => {

  if (nftContratTokenMetadataMap && nftContratTokenMetadataMap.size > 0)
    setCategories([
      {
        id: "Trading",
        children: [
          {
            id: "Bottle offers",
            icon: <SellIcon />,
            path: "/" + PagesPaths.OFFERS,
          },
        ],
      },
      {
        id: "Administration",
        children: [
          {
            id: "Mint wine collection",
            icon: <SettingsIcon />,
            path: "/" + PagesPaths.MINT,
          },
        ],
      },
    ]);
}, [nftContratTokenMetadataMap, userAddress]);
```

## Let's play

1. Connect with your wallet an choose `alice` account (or one of the administrators you set on the smart contract earlier). You are redirected to the Administration /mint page as there is no nft minted yet
2. Enter these values on the form for example :

- name : Saint Emilion - Franc la Rose
- symbol : SEMIL
- description : Grand cru 2007

3. Click on `Upload an image` an select a bottle picture on your computer
4. Click on Mint button

Your picture will be psuhed to IPFS and will display, then you are asked to sign the mint operation

- Confirm operation
- Wait less than 1 minutes until you get the confirmation notification, the page will refresh automatically

Now you can see the `Trading` menu and the `Bottle offers` sub menu

Click on the sub-menu entry

You are owner of this bottle so you can make an offer on it

- Enter a price offer
- Click on `SELL` button
- Wait a bit for the confirmation, then it refreshes and you have an offer attached to your NFT

## Create the Wine Catalogue page

Create the Wine Catalogue page

```bash
touch ./src/WineCataloguePage.tsx
```

Add this code inside the created file :

```typescript
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import {
  Avatar,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
} from "@mui/material";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import BigNumber from "bignumber.js";
import { useFormik } from "formik";
import { useSnackbar } from "notistack";
import React, { Fragment } from "react";
import * as yup from "yup";
import { UserContext, UserContextType } from "./App";
import { TransactionInvalidBeaconError } from "./TransactionInvalidBeaconError";
import { address, nat } from "./type-aliases";

type OfferEntry = [nat, Offer];

type Offer = {
  owner: address;
  price: nat;
};

const validationSchema = yup.object({});

export default function WineCataloguePage() {
  const {
    nftContrat,
    nftContratTokenMetadataMap,
    refreshUserContextOnPageReload,
    storage,
  } = React.useContext(UserContext) as UserContextType;
  const [selectedOfferEntry, setSelectedOfferEntry] =
    React.useState<OfferEntry | null>(null);

  const formik = useFormik({
    initialValues: {},
    validationSchema: validationSchema,
    onSubmit: (values) => {
      console.log("onSubmit: (values)", values, selectedOfferEntry);
      buy(selectedOfferEntry!);
    },
  });
  const { enqueueSnackbar } = useSnackbar();

  const buy = async (selectedOfferEntry: OfferEntry) => {
    try {
      const op = await nftContrat?.methods
        .buy(
          BigNumber(selectedOfferEntry[0]) as nat,
          selectedOfferEntry[1].owner
        )
        .send({
          amount: selectedOfferEntry[1].price.toNumber(),
          mutez: true,
        });

      await op?.confirmation(2);

      enqueueSnackbar(
        "Bought " +
          1 +
          " unit of Wine collection (token_id:" +
          selectedOfferEntry[0] +
          ")",
        {
          variant: "success",
        }
      );

      refreshUserContextOnPageReload(); //force all app to refresh the context
    } catch (error) {
      console.table(`Error: ${JSON.stringify(error, null, 2)}`);
      let tibe: TransactionInvalidBeaconError =
        new TransactionInvalidBeaconError(error);
      enqueueSnackbar(tibe.data_message, {
        variant: "error",
        autoHideDuration: 10000,
      });
    }
  };

  return (
    <Box
      component="main"
      sx={{
        flex: 1,
        py: 6,
        px: 4,
        bgcolor: "#eaeff1",
        backgroundImage:
          "url(https://en.vinex.market/skin/default/images/banners/home/new/banner-1180.jpg)",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <Paper sx={{ maxWidth: 936, margin: "auto", overflow: "hidden" }}>
        {storage?.offers && storage?.offers.size != 0 ? (
          Array.from(storage?.offers.entries()).map(([token_id, offer]) => (
            <Card key={offer.owner + "-" + token_id.toString()}>
              <CardHeader
                avatar={
                  <Avatar sx={{ bgcolor: "purple" }} aria-label="recipe">
                    {token_id.toString()}
                  </Avatar>
                }
                title={
                  nftContratTokenMetadataMap.get(token_id.toNumber())?.name
                }
                subheader={"seller : " + offer.owner}
              />

              <CardContent>
                <div>
                  {"Offer : " +
                    1 +
                    " at price " +
                    offer.price.dividedBy(1000000) +
                    " XTZ/bottle"}
                </div>
              </CardContent>

              <CardActions disableSpacing>
                <form
                  onSubmit={(values) => {
                    setSelectedOfferEntry([token_id, offer]);
                    formik.handleSubmit(values);
                  }}
                >
                  <Button type="submit" aria-label="add to favorites">
                    <ShoppingCartIcon /> BUY
                  </Button>
                </form>
              </CardActions>
            </Card>
          ))
        ) : (
          <Fragment />
        )}
      </Paper>
    </Box>
  );
}
```

## Update the navigation

Update routes on the `./src/Paperbase.tsx` file.
Import the WineCataloguePage at the beginning of the file.

```typescript
import WineCataloguePage from "./WineCataloguePage";
```

and at the end of the file, just add this line after `<Route index element={<Welcome />} />`

```typescript
<Route path={PagesPaths.CATALOG} element={<WineCataloguePage />} />
```

## Update the menu bar on the left

Edit `Navigator.tsx` file to replace the previous effect, we add another menu entry

```typescript
useEffect(() => {
  if (nftContratTokenMetadataMap && nftContratTokenMetadataMap.size > 0)
    setCategories([
      {
        id: "Trading",
        children: [
          {
            id: "Wine catalogue",
            icon: <WineBarIcon />,
            path: "/" + PagesPaths.CATALOG,
          },
          {
            id: "Bottle offers",
            icon: <SellIcon />,
            path: "/" + PagesPaths.OFFERS,
          },
        ],
      },
      {
        id: "Administration",
        children: [
          {
            id: "Mint wine collection",
            icon: <SettingsIcon />,
            path: "/" + PagesPaths.MINT,
          },
        ],
      },
    ]);
}, [nftContratTokenMetadataMap, userAddress]);
```

## Let's play

Now you can see on `Trading` menu the `Wine catalogue` sub menu

Click on the sub-menu entry

As you are connected with the default administrator you can see your own unique offer on the market

- Disconnect from your user and connect with another account (who has enough XTZ to buy the bottle)
- The logged buyer can see that alice is selling a bottle
- Buy the bottle while clicking on `BUY` button
- Wait for the confirmation, then the offer is removed from the market
- Click on `bottle offers` sub menu
- You are now the owner of this bottle, you can resell it at your own price, etc ...

# :palm_tree: Conclusion :sun_with_face:

You were able to create an NFT collection marketplace from the ligo library, now you can buy or sell nft at your own price.
This concludes the nft training

On next training, you will see another kind of NFT called `single asset`. Instead of creating x token types, you will be authorize to create only 1 token_id 0, on the other side, you can mint a quantity n of this token.

[:arrow_right: NEXT](https://github.com/marigold-dev/training-nft-3)

//TODO pictures to include everywhere
