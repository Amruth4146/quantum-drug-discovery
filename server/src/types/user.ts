export interface User {
  id:           string
  fullName:     string
  username?:    string
  email:        string
  passwordHash: string
  avatar?:      string      // URL or base64
  provider:     'email' | 'google' | 'github'
  isVerified:   boolean
  createdAt:    string
  updatedAt:    string
  lastLoginAt?: string
}

export interface UserPublic {
  id:          string
  fullName:    string
  username?:   string
  email:       string
  avatar?:     string
  provider:    string
  isVerified:  boolean
  createdAt:   string
  lastLoginAt?: string
}

export interface SignUpBody {
  fullName:  string
  username?: string
  email:     string
  password:  string
  avatar?:   string
}

export interface SignInBody {
  identifier: string   // email or username
  password:   string
}

export interface JwtPayload {
  userId:   string
  email:    string
  fullName: string
}
