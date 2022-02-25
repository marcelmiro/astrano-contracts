// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../mocks/UniswapV2FactoryMock.sol";

library Math {
    /**
     * @dev based on https://solidity-by-example.org/library/
     */
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}

/* solhint-disable no-unused-vars */
contract UniswapV2Router02Mock {
    address private immutable _factory;

    constructor(address factory_) {
        _factory = factory_;
    }

    function factory() public view returns (address) {
        return _factory;
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        public
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        )
    {
        IERC20(tokenA).transferFrom(msg.sender, address(this), amountADesired);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountBDesired);
        uint256 liquidityAmount = Math.sqrt(amountADesired * amountBDesired);
        UniswapV2FactoryMock(_factory).transferPair(tokenA, tokenB, to, liquidityAmount);
        return (amountADesired, amountBDesired, liquidityAmount);
    }
}
