//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20{
    constructor(uint256 totalSupply) ERC20("DevToken", "DVT"){
        _mint(msg.sender, totalSupply);
    }
}