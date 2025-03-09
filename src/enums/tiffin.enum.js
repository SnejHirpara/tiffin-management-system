export class TiffinType {
    static REGULAR = "Regular";
    static SWAMINARAYAN = "Swaminarayan";
    static JAIN = "Jain";

    static isValid(type) {
        return [TiffinType.REGULAR, TiffinType.SWAMINARAYAN, TiffinType.JAIN].includes(type);
    }
}