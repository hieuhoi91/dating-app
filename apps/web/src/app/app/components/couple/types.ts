export type CoupleTab =
  | 'space'
  | 'invitations'
  | 'questions'
  | 'challenges'
  | 'memories'
  | 'journal'
  | 'dates'
  | 'settings';

export type CoupleNotice = (message: string) => void;

export type CoupleInvitation = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  expires_at: string;
  sender: { username: string | null; display_name: string } | null;
  receiver: { username: string | null; display_name: string } | null;
};
