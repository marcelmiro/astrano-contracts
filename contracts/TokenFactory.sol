// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./interfaces/ITokenFactory.sol";
import "./Token.sol";

contract TokenFactory is ITokenFactory {
    function createToken(
        string calldata name,
        string calldata symbol,
        uint256 totalSupply
    ) external returns (address) {
        Token token = new Token(name, symbol, totalSupply, msg.sender);
        return address(token);
    }
}
