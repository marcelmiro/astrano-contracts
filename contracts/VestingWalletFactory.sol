// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IVestingWalletFactory.sol";
import "./VestingWallet.sol";

contract VestingWalletFactory is IVestingWalletFactory {
    function createVestingWallet(address beneficiary) external returns (address) {
        VestingWallet vestingWallet = new VestingWallet(beneficiary);
        return address(vestingWallet);
    }
}
