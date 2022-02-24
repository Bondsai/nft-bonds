use anchor_lang::prelude::*;

#[account]
pub struct Offer {
    pub who_made_the_offer: Pubkey,
    pub kind_of_token_wanted_in_return: Pubkey,
    pub escrowed_tokens_of_offer_maker_bump: u8,

    pub start_time: i64,
    pub duration: u8,
    pub percent: u8
}
