use std::collections::HashMap;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod nft_bonds {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct EventStruct {
    pub title: String,
    pub owner: Pubkey,
    pub percent: u16,
    pub token: String,
    pub event_duration: u64,
    pub vesting_duration: u64
}

#[account]
pub struct BaseAccount {
    pub events: HashMap<Pubkey, Vec<EventStruct>>
}
