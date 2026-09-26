
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "frames": {
                  Row: {
                    "frame_number": number,"game_player_id": string,"id": string,"roll1": number | null,"roll2": number | null,"roll3": number | null
                  }
                  Insert: {
                    "frame_number": number,"game_player_id": string,"id"?: string,"roll1"?: number | null,"roll2"?: number | null,"roll3"?: number | null
                  }
                  Update: {
                    "frame_number"?: number,"game_player_id"?: string,"id"?: string,"roll1"?: number | null,"roll2"?: number | null,"roll3"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "frames_game_player_id_fkey"
      columns: ["game_player_id"]
isOneToOne: false
      referencedRelation: "game_players"
      referencedColumns: ["id"]
    }
                  ]
                },"game_players": {
                  Row: {
                    "final_rank": number | null,"final_total": number | null,"game_id": string,"id": string,"is_bot": boolean,"turn_order": number,"user_id": string | null
                  }
                  Insert: {
                    "final_rank"?: number | null,"final_total"?: number | null,"game_id": string,"id"?: string,"is_bot"?: boolean,"turn_order": number,"user_id"?: string | null
                  }
                  Update: {
                    "final_rank"?: number | null,"final_total"?: number | null,"game_id"?: string,"id"?: string,"is_bot"?: boolean,"turn_order"?: number,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_players_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_players_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"games": {
                  Row: {
                    "completed_at": string | null,"created_at": string,"created_by": string,"frame_count": number,"game_type": string,"id": string,"lobby_id": string | null,"scoring_mode": string,"status": string
                  }
                  Insert: {
                    "completed_at"?: string | null,"created_at"?: string,"created_by"?: string,"frame_count": number,"game_type"?: string,"id"?: string,"lobby_id"?: string | null,"scoring_mode": string,"status"?: string
                  }
                  Update: {
                    "completed_at"?: string | null,"created_at"?: string,"created_by"?: string,"frame_count"?: number,"game_type"?: string,"id"?: string,"lobby_id"?: string | null,"scoring_mode"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "games_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "games_lobby_id_fkey"
      columns: ["lobby_id"]
isOneToOne: false
      referencedRelation: "lobbies"
      referencedColumns: ["id"]
    }
                  ]
                },"lobbies": {
                  Row: {
                    "code": string,"created_at": string,"host_id": string,"id": string,"status": string
                  }
                  Insert: {
                    "code": string,"created_at"?: string,"host_id": string,"id"?: string,"status"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"host_id"?: string,"id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lobbies_host_id_fkey"
      columns: ["host_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"lobby_members": {
                  Row: {
                    "joined_at": string,"lobby_id": string,"user_id": string
                  }
                  Insert: {
                    "joined_at"?: string,"lobby_id": string,"user_id": string
                  }
                  Update: {
                    "joined_at"?: string,"lobby_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lobby_members_lobby_id_fkey"
      columns: ["lobby_id"]
isOneToOne: false
      referencedRelation: "lobbies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lobby_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"pairings": {
                  Row: {
                    "claimed_at": string | null,"created_at": string,"expires_at": string,"id": string,"phone_user_id": string | null,"token": string,"user_id": string
                  }
                  Insert: {
                    "claimed_at"?: string | null,"created_at"?: string,"expires_at"?: string,"id"?: string,"phone_user_id"?: string | null,"token"?: string,"user_id"?: string
                  }
                  Update: {
                    "claimed_at"?: string | null,"created_at"?: string,"expires_at"?: string,"id"?: string,"phone_user_id"?: string | null,"token"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pairings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"hair_color": string,"hairstyle": string,"id": string,"last_seen_at": string,"outfit": string,"skin_tone": string,"username": string
                  }
                  Insert: {
                    "created_at"?: string,"hair_color"?: string,"hairstyle"?: string,"id": string,"last_seen_at"?: string,"outfit"?: string,"skin_tone"?: string,"username": string
                  }
                  Update: {
                    "created_at"?: string,"hair_color"?: string,"hairstyle"?: string,"id"?: string,"last_seen_at"?: string,"outfit"?: string,"skin_tone"?: string,"username"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "leaderboard": {
                  Row: {
                    "completed_at": string | null,"final_total": number | null,"frame_count": number | null,"game_type": string | null,"scoring_mode": string | null,"user_id": string | null,"username": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_players_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "can_use_realtime_topic":
{ Args: { "topic": string }; Returns: boolean
                           },
"claim_pairing":
{ Args: { "pairing_token": string }; Returns: string
                           },
"finish_game":
{ Args: { "finished_game_id": string }; Returns: undefined
                           },
"frame_done":
{ Args: { "bonus_frame": boolean,"rolls": (number)[] }; Returns: boolean
                           },
"game_player_total":
{ Args: { "player_id": string }; Returns: number
                           },
"is_anonymous":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"touch_last_seen":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"username_available":
{ Args: { "name": string }; Returns: boolean
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const

