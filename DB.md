erDiagram
    USER ||--o{ COMMENT : adds
    USER ||--o{ LIKES : adds
    USER ||--o{ CAT : adds
    USER ||--o{ CAT : belongs
    USER ||--o{ COLONY : admins
    USER ||--o{ PROTECTOR : admins
    USER ||--o{ REPORT : reports
    USER ||--o{ REPORT_COMMENT : adds
    USER ||--o{ VERIFY_REQUEST : verifies
    USER ||--o{ VERIFY_REQUEST_COMMENT : adds
    USER {
        string id PK
        string email
        string username
        string avatarUrl
        bool isAdmin
        bool isProtector
        bool isActive
        bool isBanned
        bool isDeleted
        string banReason
        DateTime lastLoginAt
        DateTime createdAt
        DateTime updatedAt
        DateTime updatedEmailAt
        DateTime updatedUsernameAt
        DateTime deactivatedAt
        DateTime deletedAt
        DateTime bannedAt
    }
    PROTECTOR ||--o{ CAT : belongs
    PROTECTOR ||--o{ COLONY : has
    PROTECTOR ||--o{ REPORT : has
    PROTECTOR ||--|{ VERIFY_REQUEST : is
    PROTECTOR {
        string id PK
        string userId FK
        string description
        string name
        array imageUrls
        array links
        int createdYear
        double xCoordinate
        double yCoordinate
        bool isVerified
        DateTime createdAt
        DateTime updatedAt
        DateTime verifiedAt
    }
    COLONY ||--|{ CAT : belongs
    COLONY ||--o{ REPORT : has
    COLONY ||--|{ VERIFY_REQUEST : is
    COLONY {
        string id PK
        string userId FK
        string protectorId FK
        array imageUrls
        string xCoordinate
        string yCoordinate
        bool canBeFed
        bool isVerified
        DateTime createdAt
        DateTime updatedAt
        DateTime verifiedAt
    }
    CAT ||--o{ LIKES : has
    CAT ||--o{ COMMENT : has
    CAT ||--o{ REPORT : is
    CAT ||--o{ VERIFY_REQUEST : is
    CAT {
        string id PK
        string userId FK
        string protectorId FK
        string colonyId FK
        int totalLikes
        string name
        int age
        string breed
        array imageUrls
        double xCoordinate
        double yCoordinate
        string extraInfo
        bool isDomestic
        bool isMale
        bool isSterilized
        bool isFriendly
        bool isUserOwner
        DateTime createdAt
        DateTime updatedAt
        DateTime confiedOwnerAt
    }
    LIKES {
        string id PK
        string userId FK
        string catId FK
        string colonyId FK
        string protectorId FK
    }
    COMMENT ||--o{ REPORT : is
    COMMENT {
        string id PK
        string userId FK
        string catId FK
        string comment
        DateTime createdAt
        DateTime updatedAt
    }
    REPORT ||--o{ REPORT_COMMENT : has
    REPORT {
        string id PK
        string userId FK
        string commentId FK
        string catId FK
        string colonyId FK
        string protectorId FK
        string description
        bool isAccepted
        bool isRejected
        DateTime createdAt
        DateTime updatedAt
        DateTime acceptedAt
        DateTime rejectedAt
    }
    REPORT_COMMENT {
        string id PK
        string userId FK
        string reportId FK
        string colonyId FK
        string protectorId FK
        string comment
        DateTime createdAt
        DateTime updatedAt
    }
    VERIFY_REQUEST ||--o{ VERIFY_REQUEST_COMMENT : has
    VERIFY_REQUEST {
        string id PK
        string userId FK
        string protectorId FK
        string colonyId FK
        string catId FK
        string type
        string description
        bool isApproved
        bool isRejected
        DateTime createdAt
        DateTime updatedAt
        DateTime approvedAt
        DateTime rejectedAt
    }
    VERIFY_REQUEST_COMMENT {
        string id PK
        string userId FK
        string requestId FK
        string comment
        DateTime createdAt
        DateTime updatedAt
    }

