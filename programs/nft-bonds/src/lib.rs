use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("456UKN1ktAjVgUnYEDhSkG4QmvgXnK6k5HDpLwG8Gjry");

#[program]
pub mod nft_bonds {

    use super::*;

    pub fn make_offer(
        ctx: Context<MakeOffer>,
        escrowed_tokens_of_offer_maker_bump: u8,
        im_offering_this_much: u64,
    ) -> ProgramResult {
        instructions::make_offer::handler(
            ctx,
            escrowed_tokens_of_offer_maker_bump,
            im_offering_this_much
        )
    }

    pub fn accept_offer(ctx: Context<AcceptOffer>) -> ProgramResult {
        instructions::accept_offer::handler(ctx)
    }
}
