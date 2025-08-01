export interface Like {
  id?: string;
  userId: string;
  catId: string;
  colonyId?: string;
  protectorId?: string;
  createdAt?: Date;
}

export interface CreateLike {
  userId: string;
  catId: string;
  colonyId?: string;
  protectorId?: string;
}
