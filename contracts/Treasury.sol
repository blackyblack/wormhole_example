//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./Wormhole/ITokenBridge.sol";
import "./Wormhole/PortalWrappedToken.sol";

contract Treasury {

    address private token_bridge_address = address(0xF890982f9310df57d00f659cf4fd87e65adEd8d7);
    ITokenBridge token_bridge = ITokenBridge(token_bridge_address);
    address private TKN_address = address(0x94CB6E2F783b9F5274ccd19c7e316bd5badADa98); 
    ERC20 TKN = ERC20(TKN_address);

    address private token_bridge_polygon_address = address(0x377D55a7928c046E18eEbb61977e714d2a76472a);
    ITokenBridge token_bridge_polygon = ITokenBridge(token_bridge_polygon_address);
    address private TKN_address_wrapped = address(0xb541C0f67476087323B226C8dF94f03CeA4D4a6c); 
    PortalWrappedToken WTKN = PortalWrappedToken(TKN_address_wrapped);

    uint32 nonce = 0;
    mapping(uint16 => bytes32) _applicationContracts;
    mapping(bytes32 => bool) _completedMessages;

    address owner;

    constructor(){
        owner = msg.sender;
    }

    /**
        Registers it's sibling applications on other chains as the only ones that can send this instance messages
     */
    function registerApplicationContracts(uint16 chainId, bytes32 applicationAddr) public {
        require(msg.sender == owner, "Only owner can register new chains!");
        _applicationContracts[chainId] = applicationAddr;
    }

    //Returns the Balance of this Contract
    function getTKNCount() public view returns (uint256) {
        return TKN.balanceOf(address(this));
    }

    //Returns the Balance of Wrapped Count
    function getWrappedCount() public view returns (uint256) {
        return WTKN.balanceOf(address(this));
    }

    function approveTokenBridge(uint256 amt) public returns (bool) {
        return TKN.approve(token_bridge_address, amt);
    }

    function bridgeToken(uint256 amt, uint16 receipientChainId, bytes32 recipient) public returns (uint64 sequence) {
        nonce += 1;
        return token_bridge.transferTokens(TKN_address, amt, receipientChainId, recipient, 0, nonce);
    }

    function approveWrappedTokenBridge(uint256 amt) public returns (bool) {
        return WTKN.approve(token_bridge_polygon_address, amt);
    }

    function bridgeWrappedToken(uint256 amt, uint16 receipientChainId, bytes32 recipient) public returns (uint64 sequence) {
        nonce += 1;
        return token_bridge_polygon.transferTokens(TKN_address_wrapped, amt, receipientChainId, recipient, 0, nonce);
    }
}