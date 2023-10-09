
import { ContractAbstractionFromContractType, WalletContractAbstractionFromContractType } from './type-utils';
import { address, BigMap, bytes, contract, MMap, nat } from './type-aliases';

export type Storage = {
    administrators: Array<address>;
    offers: MMap<nat, {
        owner: address;
        price: nat;
    }>;
    ledger: BigMap<nat, address>;
    metadata: BigMap<string, bytes>;
    token_metadata: BigMap<nat, {
        token_id: nat;
        token_info: MMap<string, bytes>;
    }>;
    operators: BigMap<{
        0: address;
        1: address;
    }, Array<nat>>;
};

type Methods = {
    buy: (
        _0: nat,
        _1: address,
    ) => Promise<void>;
    sell: (
        _0: nat,
        _1: nat,
    ) => Promise<void>;
    mint: (
        _0: nat,
        _1: bytes,
        _2: bytes,
        _3: bytes,
        _4: bytes,
    ) => Promise<void>;
    add_operator: (
        owner: address,
        operator: address,
        token_id: nat,
    ) => Promise<void>;
    remove_operator: (
        owner: address,
        operator: address,
        token_id: nat,
    ) => Promise<void>;
    balance_of: (
        requests: Array<{
            owner: address;
            token_id: nat;
        }>,
        callback: contract,
    ) => Promise<void>;
    transfer: (param: Array<{
            from_: address;
            txs: Array<{
                to_: address;
                token_id: nat;
                amount: nat;
            }>;
        }>) => Promise<void>;
};

type MethodsObject = {
    buy: (params: {
        0: nat,
        1: address,
    }) => Promise<void>;
    sell: (params: {
        0: nat,
        1: nat,
    }) => Promise<void>;
    mint: (params: {
        0: nat,
        1: bytes,
        2: bytes,
        3: bytes,
        4: bytes,
    }) => Promise<void>;
    add_operator: (params: {
        owner: address,
        operator: address,
        token_id: nat,
    }) => Promise<void>;
    remove_operator: (params: {
        owner: address,
        operator: address,
        token_id: nat,
    }) => Promise<void>;
    balance_of: (params: {
        requests: Array<{
            owner: address;
            token_id: nat;
        }>,
        callback: contract,
    }) => Promise<void>;
    transfer: (param: Array<{
            from_: address;
            txs: Array<{
                to_: address;
                token_id: nat;
                amount: nat;
            }>;
        }>) => Promise<void>;
};

type contractTypes = { methods: Methods, methodsObject: MethodsObject, storage: Storage, code: { __type: 'NftCode', protocol: string, code: object[] } };
export type NftContractType = ContractAbstractionFromContractType<contractTypes>;
export type NftWalletType = WalletContractAbstractionFromContractType<contractTypes>;
