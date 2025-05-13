export class UserRole {
    static ADMIN = "Admin";
    static USER = "User";

    static isAdmin(role) {
        return role === UserRole.ADMIN;
    }

    static isUser(role) {
        return role === UserRole.USER;
    }

    static isValid(role) {
        return [UserRole.ADMIN, UserRole.USER].includes(role);
    }
}