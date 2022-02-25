// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface ICrowdsaleFactory {
    struct Input {
        address token;
        address pairToken;
        address owner;
        address finalizer;
        uint256 rate;
        uint256 cap;
        uint256 individualCap;
        uint256 minPurchaseAmount;
        uint256 goal;
        uint256 openingTime;
        uint256 closingTime;
    }

    function createCrowdsale(Input calldata) external returns (address);
}
