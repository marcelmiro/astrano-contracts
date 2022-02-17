// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IVestingWalletFactory {
    function createVestingWallet(address beneficiary) external returns (address);
}
