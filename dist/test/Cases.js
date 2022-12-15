"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const utils_1 = require("ethers/lib/utils");
const hardhat_1 = require("hardhat");
// Creates a set of contracts for each test suite (useful for before() and beforeEach())
async function deployContracts() {
    const gate = await hardhat_1.deBridge.emulator.deployGate();
    const Counter = (await hardhat_1.ethers.getContractFactory("CrossChainCounter"));
    const counter = (await Counter.deploy());
    await counter.deployed();
    await counter.setDeBridgeGate(gate.address);
    const Incrementor = (await hardhat_1.ethers.getContractFactory("CrossChainIncrementor"));
    const incrementor = (await Incrementor.deploy());
    await incrementor.deployed();
    await incrementor.setDeBridgeGate(gate.address);
    await incrementor.addCounter(hardhat_1.ethers.provider.network.chainId, counter.address);
    await counter.addChainSupport(hardhat_1.ethers.provider.network.chainId, incrementor.address);
    return {
        gate,
        gateProtocolFee: await gate.globalFixedNativeFee(),
        counter,
        incrementor,
    };
}
describe("CrossChainCounter and CrossChainIncrementor communication: sanity checks", function () {
    let contracts;
    const INCREMENT_BY = 10;
    before(async () => {
        contracts = await deployContracts();
    });
    it("CrossChainCounter is being incremented by the CrossChainIncrementor request", async function () {
        await contracts.incrementor.increment(INCREMENT_BY, {
            value: contracts.gateProtocolFee,
        });
        await hardhat_1.deBridge.emulator.autoClaim();
        (0, chai_1.expect)(await contracts.counter.counter()).to.be.eq(INCREMENT_BY);
    });
    it("CrossChainCounter is being incremented by the CrossChainIncrementor request (second request)", async function () {
        await contracts.incrementor.increment(INCREMENT_BY, {
            value: contracts.gateProtocolFee,
        });
        await hardhat_1.deBridge.emulator.autoClaim();
        (0, chai_1.expect)(await contracts.counter.counter()).to.be.eq(INCREMENT_BY * 2);
    });
    it("CrossChainCounter is being incremented by the CrossChainIncrementor with exFee", async function () {
        const protocolFee = await contracts.gateProtocolFee;
        const exFee = (0, utils_1.parseEther)('0.1');
        const value = exFee.add(protocolFee);
        await contracts.incrementor.incrementWithIncludedGas(INCREMENT_BY, exFee, {
            value
        });
        await hardhat_1.deBridge.emulator.autoClaim();
        (0, chai_1.expect)(await contracts.counter.counter()).to.be.eq(INCREMENT_BY * 3);
    });
    it("CrossChainCounter rejects direct call", async () => {
        // CrossChainCounter accepts only calls from the deBridgeGate's CallProxy contract,
        // rejecting calls initiated by any other contract or sender
        await (0, chai_1.expect)(contracts.counter.receiveIncrementCommand(INCREMENT_BY, hardhat_1.ethers.constants.AddressZero /*not used*/)).to.revertedWith("" /*CallProxyBadRole*/);
        // hardhat cannot decode the error because DeBridgeGate contract (which
        // is deployed by the hardhat-debridge plugin) is not presented as an artifact
        // within this hardhat instance
    });
    it("CrossChainCounter rejects a broadcasted call from non-approved native sender", async () => {
        // deploy another CrossChainIncrementor
        // it is expected that it's call won't succeed because this instance of CrossChainIncrementor
        // resides on a new address which is not approved by CrossChainCounter
        const MaliciousIncrementor = (await hardhat_1.ethers.getContractFactory("CrossChainIncrementor"));
        const maliciousIncrementor = (await MaliciousIncrementor.deploy());
        await maliciousIncrementor.deployed();
        await maliciousIncrementor.setDeBridgeGate(contracts.gate.address);
        await maliciousIncrementor.addCounter(hardhat_1.ethers.provider.network.chainId, contracts.counter.address);
        await maliciousIncrementor.increment(INCREMENT_BY, {
            value: contracts.gateProtocolFee,
        });
        // CrossChainCounter rejects all calls from deBridgeGate's CallProxy that
        // where initiated from unknown (non-trusted) contract on the supported chain
        // with NativeSenderBadRole() error raised.
        // However, CallProxy handles this error gracefully and
        // reverts another one: ExternalCallFailed()
        await (0, chai_1.expect)(hardhat_1.deBridge.emulator.autoClaim()).to.revertedWith("" /*ExternalCallFailed*/);
        // hardhat cannot decode the error because DeBridgeGate contract (which
        // is deployed by the hardhat-debridge plugin) is not presented as an artifact
        // within this hardhat instance
    });
});
