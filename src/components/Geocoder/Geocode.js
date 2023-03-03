import { ApiKeyManager } from "@esri/arcgis-rest-request";
import { geocode, suggest } from "@esri/arcgis-rest-geocoding";
import debounce from "lodash.debounce";
import { useCallback, useEffect, useReducer } from "react";

// Create an `.env.local` file and add REACT_APP_API_KEY=<your-api-key>
const API_KEY = process.env.REACT_APP_API_KEY;

const initialState = {
  data: undefined,
  loading: true,
  error: false,
};

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_SUCCESS":
      return {
        data: action.payload,
        loading: false,
        error: false,
      };
    case "FETCH_ERROR":
      return {
        data: undefined,
        loading: false,
        error: action.payload,
      };

    default:
      return state;
  }
};

const authentication = ApiKeyManager.fromKey(API_KEY);

export function geocodeResult(selectedItem) {
  const { magicKey } = selectedItem;

  geocode({ magicKey, authentication, params: { maxLocations: 1 } }).then(
    (res) => {
      const result = res.candidates[0];
      alert(
        `Address: ${result.address}\nLat/Long: [${result.location.y}, ${result.location.x}]`
      );
    }
  );
}

export function Suggest({ address, children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const debouncedCallback = useCallback(
    debounce((value) => {
      suggest(value, {
        params: { location: [-116.539247, 33.825993], maxSuggestions: 5 },
        authentication,
      })
        .then((res) => {
          dispatch({ type: "FETCH_SUCCESS", payload: res.suggestions });
        })
        .catch((e) => {
          dispatch({ type: "FETCH_ERROR", payload: e.message });
          console.error(e);
        });
    }, 300),
    []
  );

  useEffect(() => debouncedCallback(address), [address]);

  const { data, loading, error } = state;

  return children({
    data,
    loading,
    error,
  });
}
