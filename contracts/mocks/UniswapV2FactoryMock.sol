/* solhint-disable no-unused-vars */
// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../Token.sol";

contract UniswapV2FactoryMock {
    mapping(address => mapping(address => address)) public getPair;

    function createPair(address tokenA, address tokenB) public returns (address) {
        require(getPair[tokenA][tokenB] == address(0), "UniswapV2: PAIR_EXISTS");
        Token pair = new Token("Uniswap V2", "UNI-V2", type(uint256).max, address(this));
        getPair[tokenA][tokenB] = address(pair);
        getPair[tokenB][tokenA] = address(pair);
        return address(pair);
    }

    function transferPair(
        address tokenA,
        address tokenB,
        address to,
        uint256 amount
    ) public {
        SafeERC20.safeTransfer(IERC20(getPair[tokenA][tokenB]), to, amount);
    }
}
