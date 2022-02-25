// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title Token
 * @dev Custom ERC20 token contract for tokens launched by Astrano
 * @custom:security-contact marcel.miro@astrano.io
 */
contract Token is ERC20 {
    /**
     * @param name_ name of the token
     * @param symbol_ symbol of the token
     * @param totalSupply_ initial and max supply of the token
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        address beneficiary_
    ) ERC20(name_, symbol_) {
        require(beneficiary_ != address(0), "beneficiary is the zero address");
        _mint(beneficiary_, totalSupply_);
    }
}
