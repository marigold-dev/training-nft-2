## :round_pushpin: [See Github version and full code here](https://github.com/marigold-dev/training-nft-2)

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

Add offer type

```ligolang
type offer = {
  owner : address,
  price : nat
};
```

Add `offers` field to storage

```ligolang
type storage =
  {
    administrators: set<address>,
    offers: map<nat,offer>,  //user sells an offer
    ledger: NFT.Ledger.t,
    metadata: NFT.Metadata.t,
    token_metadata: NFT.TokenMetadata.t,
    operators: NFT.Operators.t,
    token_ids : set<NFT.Storage.token_id>
  };
```

Add 2 variants `Buy and Sell` to parameter

```ligolang
type parameter =
  | ["Mint", nat,bytes,bytes,bytes,bytes] //token_id, name , description  ,symbol , ipfsUrl
  | ["Buy", nat, address]  //buy token_id at a seller offer price
  | ["Sell", nat, nat]  //sell token_id at a price
  | ["AddAdministrator" , address]
  | ["Transfer", NFT.transfer]
  | ["Balance_of", NFT.balance_of]
  | ["Update_operators", NFT.update_operators];
```

Add 2 entrypoints `Buy and Sell` on main

```ligolang
const main = ([p, s]: [parameter,storage]): ret =>
    match(p, {
     Mint: (p: [nat,bytes,bytes,bytes,bytes]) => mint(p[0],p[1],p[2],p[3],p[4],s),
     Buy: (p : [nat,address]) => [list([]),s],
     Sell: (p : [nat,nat]) => [list([]),s],
     AddAdministrator : (p : address) => {if(Set.mem(Tezos.get_sender(), s.administrators)){ return [list([]),{...s,administrators:Set.add(p, s.administrators)}]} else {return failwith("1");}} ,
     Transfer: (p: NFT.transfer) => [list([]),s],
     Balance_of: (p: NFT.balance_of) => [list([]),s],
     Update_operators: (p: NFT.update_operator) => [list([]),s],
     });
```

Explanations :

- an `offer` is a nft sale at a price owned by someone
- `storage` has a new field to support `offers`, a map of offers for each nft sold by an owner
- `parameter` has more entrypoints for selling/buying `(Sell,Buy)`
- `main` function exposes the new entrypoints

Update also the initial storage on file `nft.storages.jsligo` to initialize `offers`

```ligolang
#include "nft.jsligo"
const default_storage =
  {administrators: Set.literal(list(["tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb"
      as address]))
    as set<address>,
   offers: Map.empty as map<nat,offer>,
   ledger: Big_map.empty as NFT.Ledger.t,
   metadata: Big_map.empty as NFT.Metadata.t,
   token_metadata: Big_map.empty as NFT.TokenMetadata.t,
   operators: Big_map.empty as NFT.Operators.t,
   token_ids: Set.empty as set<NFT.Storage.token_id>
   };
```

Compile the contract

```bash
TAQ_LIGO_IMAGE=ligolang/ligo:0.57.0 taq compile nft.jsligo
```

## :credit_card: Sell at an offer price

Let's add the `sell` function. Edit the code sections as below

```ligolang
const sell = (token_id : nat,price: nat, s: storage) : ret => {

  //check balance of seller
  const sellerBalance = NFT.Storage.get_balance({ledger:s.ledger,metadata:s.metadata,operators:s.operators,token_metadata:s.token_metadata,token_ids : s.token_ids},Tezos.get_source(),token_id);
  if(sellerBalance != (1 as nat)) return failwith("2");

  //need to allow the contract itself to be an operator on behalf of the seller
  const newOperators = NFT.Operators.add_operator(s.operators,Tezos.get_source(),Tezos.get_self_address(),token_id);

  //DECISION CHOICE: if offer already exists, we just override it
  return [list([]) as list<operation>,{...s,offers:Map.add(token_id,{owner : Tezos.get_source(), price : price},s.offers),operators:newOperators}];
};
```

Call `sell` function on main

```ligolang
const main = ([p, s]: [parameter,storage]): ret =>
    match(p, {
     Mint: (p: [nat,bytes,bytes,bytes,bytes]) => mint(p[0],p[1],p[2],p[3],p[4],s),
     Buy: (p : [nat,address]) => [list([]),s],
     Sell: (p : [nat,nat]) => sell(p[0],p[1], s),
     AddAdministrator : (p : address) => {if(Set.mem(Tezos.get_sender(), s.administrators)){ return [list([]),{...s,administrators:Set.add(p, s.administrators)}]} else {return failwith("1");}} ,
     Transfer: (p: NFT.transfer) => [list([]),s],
     Balance_of: (p: NFT.balance_of) => [list([]),s],
     Update_operators: (p: NFT.update_operator) => [list([]),s],
     });
```

Explanations :

- first, we check the balance of the seller, he should have enough token to place an offer
- the seller will set the nft marketplace smartcontract as operator. The reason is while the buyer will send his money to buy the NFT, the smartcontract will change the nft ownership (it is not interactive with the seller, the martketplace will do it on behalf of the seller based on the offer data)
- we update the storage to publish the offer
- adding the call to `sell` function on `main` function is straightforward

## :credit_card: Buy a bottle on the market

Now that we have offers on the market, we are able to buy bottles

Edit the smart contract to add this feature, as below

```ligolang
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
```

Call `buy` function on main

```ligolang
const main = ([p, s]: [parameter,storage]): ret =>
    match(p, {
     Mint: (p: [nat,bytes,bytes,bytes,bytes]) => mint(p[0],p[1],p[2],p[3],p[4],s),
     Buy: (p : [nat,address]) => buy(p[0],p[1],s),
     Sell: (p : [nat,nat]) => sell(p[0],p[1], s),
     AddAdministrator : (p : address) => {if(Set.mem(Tezos.get_sender(), s.administrators)){ return [list([]),{...s,administrators:Set.add(p, s.administrators)}]} else {return failwith("1");}} ,
     Transfer: (p: NFT.transfer) => [list([]),s],
     Balance_of: (p: NFT.balance_of) => [list([]),s],
     Update_operators: (p: NFT.update_operator) => [list([]),s],
     });
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
TAQ_LIGO_IMAGE=ligolang/ligo:0.57.0 taq compile nft.jsligo
taq deploy nft.tz -e "testing"
```

```logs
┌──────────┬──────────────────────────────────────┬───────┬──────────────────┬────────────────────────────────┐
│ Contract │ Address                              │ Alias │ Balance In Mutez │ Destination                    │
├──────────┼──────────────────────────────────────┼───────┼──────────────────┼────────────────────────────────┤
│ nft.tz   │ KT1PLvVGaM4YE1qLSdLZUZ1EhozqzYUQ1xed │ nft   │ 0                │ https://ghostnet.ecadinfra.com │
└──────────┴──────────────────────────────────────┴───────┴──────────────────┴────────────────────────────────┘
```

:tada: Hooray ! We have finished the backend :tada:

# :performing_arts: NFT Marketplace front

Generate Typescript classes and go to the frontend to run the server

```bash
taq generate types ./app/src
cd ./app
yarn install
yarn run start
```

## Sale page

Edit Sale Page on `./src/OffersPage.tsx`

Add this code inside the file :

```typescript
import { InfoOutlined } from "@mui/icons-material";
import SellIcon from "@mui/icons-material/Sell";

import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CardMedia,
  ImageList,
  InputAdornment,
  Pagination,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import Paper from "@mui/material/Paper";
import BigNumber from "bignumber.js";
import { useFormik } from "formik";
import { useSnackbar } from "notistack";
import React, { Fragment, useEffect, useState } from "react";
import * as yup from "yup";
import { UserContext, UserContextType } from "./App";
import ConnectButton from "./ConnectWallet";
import { TransactionInvalidBeaconError } from "./TransactionInvalidBeaconError";
import { address, nat } from "./type-aliases";

const itemPerPage: number = 6;

const validationSchema = yup.object({
  price: yup
    .number()
    .required("Price is required")
    .positive("ERROR: The number must be greater than 0!"),
});

type Offer = {
  owner: address;
  price: nat;
};

export default function OffersPage() {
  const [selectedTokenId, setSelectedTokenId] = React.useState<number>(0);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(1);

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
    Tezos,
    setUserAddress,
    setUserBalance,
    wallet,
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

  const isDesktop = useMediaQuery("(min-width:1100px)");
  const isTablet = useMediaQuery("(min-width:600px)");

  return (
    <Paper>
      <Typography style={{ paddingBottom: "10px" }} variant="h5">
        Sell my bottles
      </Typography>
      {ownerTokenIds && ownerTokenIds.size != 0 ? (
        <Fragment>
          <Pagination
            page={currentPageIndex}
            onChange={(_, value) => setCurrentPageIndex(value)}
            count={Math.ceil(
              Array.from(ownerTokenIds.entries()).length / itemPerPage
            )}
            showFirstButton
            showLastButton
          />

          <ImageList
            cols={isDesktop ? itemPerPage / 2 : isTablet ? itemPerPage / 3 : 1}
          >
            {Array.from(ownerTokenIds.entries())
              .filter((_, index) =>
                index >= currentPageIndex * itemPerPage - itemPerPage &&
                index < currentPageIndex * itemPerPage
                  ? true
                  : false
              )
              .map(([token_id]) => (
                <Card key={token_id + "-" + token_id.toString()}>
                  <CardHeader
                    avatar={
                      <Tooltip
                        title={
                          <Box>
                            <Typography>
                              {" "}
                              {"ID : " + token_id.toString()}{" "}
                            </Typography>
                            <Typography>
                              {"Description : " +
                                nftContratTokenMetadataMap.get(
                                  token_id.toNumber()
                                )?.description}
                            </Typography>
                          </Box>
                        }
                      >
                        <InfoOutlined />
                      </Tooltip>
                    }
                    title={
                      nftContratTokenMetadataMap.get(token_id.toNumber())?.name
                    }
                  />
                  <CardMedia
                    sx={{ width: "auto", marginLeft: "33%" }}
                    component="img"
                    height="100px"
                    image={nftContratTokenMetadataMap
                      .get(token_id.toNumber())
                      ?.thumbnailUri?.replace(
                        "ipfs://",
                        "https://gateway.pinata.cloud/ipfs/"
                      )}
                  />

                  <CardContent>
                    <Box>
                      <Typography variant="body2">
                        {offersTokenIDMap.get(token_id)
                          ? "Traded : " +
                            1 +
                            " (price : " +
                            offersTokenIDMap
                              .get(token_id)
                              ?.price.dividedBy(1000000) +
                            " Tz)"
                          : ""}
                      </Typography>
                    </Box>
                  </CardContent>

                  <CardActions>
                    {!userAddress ? (
                      <Box marginLeft="5vw">
                        <ConnectButton
                          Tezos={Tezos}
                          nftContratTokenMetadataMap={
                            nftContratTokenMetadataMap
                          }
                          setUserAddress={setUserAddress}
                          setUserBalance={setUserBalance}
                          wallet={wallet}
                        />
                      </Box>
                    ) : (
                      <form
                        style={{ width: "100%" }}
                        onSubmit={(values) => {
                          setSelectedTokenId(token_id.toNumber());
                          formik.handleSubmit(values);
                        }}
                      >
                        <span>
                          <TextField
                            type="number"
                            name="price"
                            label="price"
                            placeholder="Enter a price"
                            variant="filled"
                            value={formik.values.price}
                            onChange={formik.handleChange}
                            error={
                              formik.touched.price &&
                              Boolean(formik.errors.price)
                            }
                            helperText={
                              formik.touched.price && formik.errors.price
                            }
                            InputProps={{
                              endAdornment: (
                                <InputAdornment position="end">
                                  <Button
                                    type="submit"
                                    aria-label="add to favorites"
                                  >
                                    <SellIcon /> Sell
                                  </Button>
                                </InputAdornment>
                              ),
                            }}
                          />
                        </span>
                      </form>
                    )}
                  </CardActions>
                </Card>
              ))}{" "}
          </ImageList>
        </Fragment>
      ) : (
        <Typography sx={{ py: "2em" }} variant="h4">
          Sorry, you don't own any bottles, buy or mint some first
        </Typography>
      )}
    </Paper>
  );
}
```

Explanations :

- the template will display all owned NFTs. Only NFTs belonging to the logged user are selected
- for each nft, we have a form to make an offer at a price
- if you do an offer, it calls the `sell` function and the smart contract entrypoint `nftContrat?.methods.sell(BigNumber(token_id) as nat,BigNumber(price * 1000000) as nat).send()`. We multiply the XTZ price by 10^6 because the smartcontract manipulates mutez.

## Let's play : Sell

1. Connect with your wallet an choose `alice` account (or one of the administrators you set on the smart contract earlier). You are redirected to the Administration /mint page as there is no nft minted yet
2. Enter these values on the form for example :

- name : Saint Emilion - Franc la Rose
- symbol : SEMIL
- description : Grand cru 2007

3. Click on `Upload an image` an select a bottle picture on your computer
4. Click on Mint button

Your picture will be pushed to IPFS and will display, then you are asked to sign the mint operation

- Confirm operation
- Wait less than 1 minutes until you get the confirmation notification, the page will refresh automatically

Now, go to the `Trading` menu and the `Sell bottle` sub menu

Click on the sub-menu entry

![sell.png](./doc/sell.png)

You are owner of this bottle so you can make an offer on it

- Enter a price offer
- Click on `SELL` button
- Wait a bit for the confirmation, then it refreshes and you have an offer attached to your NFT

## Wine Catalogue page

Edit the Wine Catalogue page on `./src/WineCataloguePage.tsx`

Add this code inside the file :

```typescript
import { InfoOutlined } from "@mui/icons-material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CardMedia,
  ImageList,
  Pagination,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

import BigNumber from "bignumber.js";
import { useFormik } from "formik";
import { useSnackbar } from "notistack";
import React, { Fragment, useState } from "react";
import * as yup from "yup";
import { UserContext, UserContextType } from "./App";
import ConnectButton from "./ConnectWallet";
import { TransactionInvalidBeaconError } from "./TransactionInvalidBeaconError";
import { address, nat } from "./type-aliases";

const itemPerPage: number = 6;

type OfferEntry = [nat, Offer];

type Offer = {
  owner: address;
  price: nat;
};

const validationSchema = yup.object({});

export default function WineCataloguePage() {
  const {
    Tezos,
    nftContratTokenMetadataMap,
    setUserAddress,
    setUserBalance,
    wallet,
    userAddress,
    nftContrat,
    refreshUserContextOnPageReload,
    storage,
  } = React.useContext(UserContext) as UserContextType;
  const [selectedOfferEntry, setSelectedOfferEntry] =
    React.useState<OfferEntry | null>(null);

  const formik = useFormik({
    initialValues: {
      quantity: 1,
    },
    validationSchema: validationSchema,
    onSubmit: (values) => {
      console.log("onSubmit: (values)", values, selectedOfferEntry);
      buy(selectedOfferEntry!);
    },
  });
  const { enqueueSnackbar } = useSnackbar();
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(1);

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
  const isDesktop = useMediaQuery("(min-width:1100px)");
  const isTablet = useMediaQuery("(min-width:600px)");
  return (
    <Paper>
      <Typography style={{ paddingBottom: "10px" }} variant="h5">
        Wine catalogue
      </Typography>

      {storage?.offers && storage?.offers.size != 0 ? (
        <Fragment>
          <Pagination
            page={currentPageIndex}
            onChange={(_, value) => setCurrentPageIndex(value)}
            count={Math.ceil(
              Array.from(storage?.offers.entries()).length / itemPerPage
            )}
            showFirstButton
            showLastButton
          />
          <ImageList
            cols={isDesktop ? itemPerPage / 2 : isTablet ? itemPerPage / 3 : 1}
          >
            {Array.from(storage?.offers.entries())

              .filter((_, index) =>
                index >= currentPageIndex * itemPerPage - itemPerPage &&
                index < currentPageIndex * itemPerPage
                  ? true
                  : false
              )
              .map(([token_id, offer]) => (
                <Card key={offer.owner + "-" + token_id.toString()}>
                  <CardHeader
                    avatar={
                      <Tooltip
                        title={
                          <Box>
                            <Typography>
                              {" "}
                              {"ID : " + token_id.toString()}{" "}
                            </Typography>
                            <Typography>
                              {"Description : " +
                                nftContratTokenMetadataMap.get(
                                  token_id.toNumber()
                                )?.description}
                            </Typography>
                            <Typography>
                              {"Seller : " + offer.owner}{" "}
                            </Typography>
                          </Box>
                        }
                      >
                        <InfoOutlined />
                      </Tooltip>
                    }
                    title={
                      nftContratTokenMetadataMap.get(token_id.toNumber())?.name
                    }
                  />
                  <CardMedia
                    sx={{ width: "auto", marginLeft: "33%" }}
                    component="img"
                    height="100px"
                    image={nftContratTokenMetadataMap
                      .get(token_id.toNumber())
                      ?.thumbnailUri?.replace(
                        "ipfs://",
                        "https://gateway.pinata.cloud/ipfs/"
                      )}
                  />

                  <CardContent>
                    <Box>
                      <Typography variant="body2">
                        {" "}
                        {"Price : " + offer.price.dividedBy(1000000) + " XTZ"}
                      </Typography>
                    </Box>
                  </CardContent>

                  <CardActions>
                    {!userAddress ? (
                      <Box marginLeft="5vw">
                        <ConnectButton
                          Tezos={Tezos}
                          nftContratTokenMetadataMap={
                            nftContratTokenMetadataMap
                          }
                          setUserAddress={setUserAddress}
                          setUserBalance={setUserBalance}
                          wallet={wallet}
                        />
                      </Box>
                    ) : (
                      <form
                        style={{ width: "100%" }}
                        onSubmit={(values) => {
                          setSelectedOfferEntry([token_id, offer]);
                          formik.handleSubmit(values);
                        }}
                      >
                        <Button type="submit" aria-label="add to favorites">
                          <ShoppingCartIcon /> BUY
                        </Button>
                      </form>
                    )}
                  </CardActions>
                </Card>
              ))}
          </ImageList>
        </Fragment>
      ) : (
        <Typography sx={{ py: "2em" }} variant="h4">
          Sorry, there is not NFT to buy yet, you need to mint or sell bottles
          first
        </Typography>
      )}
    </Paper>
  );
}
```

## Let's play : Buy

Now you can see on `Trading` menu the `Wine catalogue` sub menu

Click on the sub-menu entry

![buy.png](./doc/buy.png)

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
