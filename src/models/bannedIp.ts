export interface BannedIp {
  id?: string;
  ipAddress: string;
  reason: string;
  bannedBy: string;
  bannedByUsername?: string;
  bannedAt: Date;
  updatedAt?: Date;
}

export interface CreateBannedIp {
  ipAddress: string;
  reason: string;
  bannedBy: string;
  bannedAt: Date;
  updatedAt?: Date;
}
