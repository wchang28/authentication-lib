import * as types from "./types";
export interface Options {
    TimeoutMS?: number;
}
export declare function get(authImpl: types.IAuthenticationImplementation, options?: Options): types.IMFAAuthenticationStack;
