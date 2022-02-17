/* solhint-disable no-unused-vars */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./../Token.sol";

contract UniswapV2FactoryMock {
    function createPair(address tokenA, address tokenB) public returns (address pair) {
        Token lpToken = new Token("Uniswap V2", "UNI-V2", 1000, address(this));
        return address(lpToken);
    }
}
