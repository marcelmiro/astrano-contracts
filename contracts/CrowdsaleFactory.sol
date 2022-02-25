// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/ICrowdsaleFactory.sol";
import "./Crowdsale.sol";

contract CrowdsaleFactory is ICrowdsaleFactory {
    function createCrowdsale(Input calldata input_) external returns (address) {
        Crowdsale crowdsale = new Crowdsale(
            input_.token,
            input_.pairToken,
            input_.owner,
            input_.finalizer,
            input_.rate,
            input_.cap,
            input_.individualCap,
            input_.minPurchaseAmount,
            input_.goal,
            input_.openingTime,
            input_.closingTime
        );
        return address(crowdsale);
    }
}
