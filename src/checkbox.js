import { useEffect } from "react";
import {
  keys,
  createStore,
} from "https://unpkg.com/idb-keyval@5.0.2/dist/esm/index.js";
const Checkbox = (props) => {
  let {
    filesName,

    checked,
    handleCheckAllChange,
    handleOnChange,
  } = props;
  useEffect(() => {}, [filesName]);
  return <></>;
};

export default Checkbox;
