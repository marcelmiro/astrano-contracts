// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface ITokenFactory {
    function createToken(
        string calldata name,
        string calldata symbol,
        uint256 totalSupply
    ) external returns (address);
}
