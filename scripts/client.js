const anchor = require('@project-serum/anchor');

const { TOKEN_PROGRAM_ID, sleep, getTokenAccount, createMint, createTokenAccount, mintToAccount } = require('./utils');

const provider = anchor.Provider.local();
anchor.setProvider(provider);

async function main() {
    console.log('walletKey', provider.wallet.publicKey.toString());
    console.log('token', TOKEN_PROGRAM_ID.toString());

    const idl = JSON.parse(require('fs').readFileSync('./target/idl/ido_pool.json', 'utf8'));
    const programId = new anchor.web3.PublicKey('51AJGMBv8DkxEpCTkitMWzsR3yn8hc5TbW3dHk6UyJsw');

    const program = new anchor.Program(idl, programId);

    // const solMint = await createMint(provider);
    // console.log(solMint);

    const solMint = new anchor.web3.PublicKey('B3QNZAzzCopug5veJ5r8uKT4q4kyBEUmEGWg7cECHsJp');
    console.log('solMint', solMint.toString());

    const solcMint = new anchor.web3.PublicKey('Ay5fghTKSkqvLPGJa74AxSTv3qbauGHUSqaf3467g4sD');
    console.log('solcMint', solcMint.toString());

    const solCIdoAmount = new anchor.BN(5000000);

    const creatorSolC = new anchor.web3.PublicKey('H8voXEvEPnfPUx6x7CU1sZAzxAJrux78PnjkGMie7uiF');

    await mintToAccount(provider, solcMint, creatorSolC, solCIdoAmount, provider.wallet.publicKey);

    // let creatorSol = await createTokenAccount(provider, solMint, provider.wallet.publicKey);
    // console.log('creatorSol', creatorSol.toString());

    let creatorSolCAccountInfo = await getTokenAccount(provider, creatorSolC);
    console.log('owner', creatorSolCAccountInfo.amount.toNumber());

    const [_poolSigner, nonce] = await anchor.web3.PublicKey.findProgramAddress(
        [solcMint.toBuffer()],
        program.programId
    );
    poolSigner = _poolSigner;
    console.log('Pool Signer', poolSigner.toString());

    const redeemableMint = await createMint(provider, poolSigner);
    const poolSolC = await createTokenAccount(provider, solcMint, poolSigner);
    const poolSol = await createTokenAccount(provider, solMint, poolSigner);

    const poolAccount = anchor.web3.Keypair.generate();
    console.log('Pool Account', poolAccount.publicKey.toString());

    const nowBn = new anchor.BN(Date.now() / 1000);
    const startIdoTs = nowBn.add(new anchor.BN(5));
    console.log('Start', startIdoTs.toNumber());

    const endDepositsTs = nowBn.add(new anchor.BN(10000));
    const endIdoTs = nowBn.add(new anchor.BN(15000));

    await program.rpc.initializePool(solCIdoAmount, nonce, startIdoTs, endDepositsTs, endIdoTs, {
        accounts: {
            poolAccount: poolAccount.publicKey,
            poolSigner,
            distributionAuthority: provider.wallet.publicKey,
            creatorWatermelon: creatorSolC,
            redeemableMint,
            usdcMint: solMint,
            poolWatermelon: poolSolC,
            poolUsdc: poolSol,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
        signers: [poolAccount],
        instructions: [await program.account.poolAccount.createInstruction(poolAccount)],
    });

    creatorSolCAccountInfo = await getTokenAccount(provider, creatorSolC);
    console.log('owner', creatorSolCAccountInfo.amount.toNumber());

    poolSolCAccountInfo = await getTokenAccount(provider, poolSolC);
    console.log('pool', poolSolCAccountInfo.amount.toNumber());

    const poolAccountInfo = await program.account.poolAccount.fetch(poolAccount.publicKey);
    console.log('Start', poolAccountInfo.startIdoTs.toNumber());
}

console.log('Running client.');
main().then(() => console.log('Success'));
