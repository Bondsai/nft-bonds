use std::collections::{BTreeMap, HashMap};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("8LxVy5z37GBWNHwF45XBe3DT82qdbd9Zez2BCe3BrPw1");

#[program]
pub mod nft_bonds {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
        let base_account = &mut ctx.accounts.base_account;
        base_account.events = Vec::new();
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 9000)]
    pub base_account: Account<'info, BaseAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program <'info, System>,
}



#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct EventStruct {
    pub title: String,
    pub owner: Pubkey,
    pub event_duration: u64,
    pub percent: u16,
    pub nfts: Vec<Pubkey>,

    pub token: Pubkey,
    pub tokens_num: u64,
    pub vesting_duration: u64,
}

#[account]
pub struct BaseAccount {
    pub events: Vec<EventStruct>
}
