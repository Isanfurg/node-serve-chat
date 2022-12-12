import defaultsDeep from "lodash/defaultsDeep.js";
export class Model {
    constructor(attributes = {}) {
      defaultsDeep(this, attributes, this.defaults);
    }
    
  }
 