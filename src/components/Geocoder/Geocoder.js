import React from "react";
import { useCallback, useEffect, useReducer } from "react";
import Downshift from "downshift";
import { ApiKeyManager } from "@esri/arcgis-rest-request";
import { geocode, suggest } from "@esri/arcgis-rest-geocoding";
import debounce from "lodash.debounce";
import {
  Label,
  Menu,
  ControllerButton,
  Input,
  Item,
  ArrowIcon,
  XIcon,
  css,
} from "./Styles";

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

export default function Geocoder() {
  const handleStateChange = ({ selectedItem }) => {
    if (selectedItem) {
      geocodeResult(selectedItem);
    }
  };

  return (
    <Downshift
      itemToString={(item) => (item ? item.text : "")}
      onStateChange={handleStateChange}
    >
      {({
        selectedItem,
        getInputProps,
        getItemProps,
        highlightedIndex,
        isOpen,
        inputValue,
        getLabelProps,
        clearSelection,
        getToggleButtonProps,
        getMenuProps,
      }) => (
        <div {...css({ width: 450, margin: "auto" })}>
          <Label {...getLabelProps()}>Search Address</Label>
          <div {...css({ position: "relative" })}>
            <Input
              {...getInputProps({
                placeholder: "Search Address",
              })}
            />
            {selectedItem ? (
              <ControllerButton
                onClick={clearSelection}
                aria-label="clear selection"
              >
                <XIcon />
              </ControllerButton>
            ) : (
              <ControllerButton {...getToggleButtonProps()}>
                <ArrowIcon isOpen={isOpen} />
              </ControllerButton>
            )}
          </div>
          <div {...css({ position: "relative", zIndex: 1000 })}>
            <Menu {...getMenuProps({ isOpen })}>
              {(() => {
                if (!isOpen) {
                  return null;
                }

                if (!inputValue) {
                  return <Item disabled>You have to enter a search query</Item>;
                }

                return (
                  <Suggest address={inputValue}>
                    {({ loading, error, data = [] }) => {
                      if (loading) {
                        return <Item disabled>Loading...</Item>;
                      }

                      if (error) {
                        return <Item disabled>Error! {error}</Item>;
                      }

                      if (!data.length) {
                        return <Item disabled>No Addresses found</Item>;
                      }

                      return data.map((item, index) => (
                        <Item
                          key={index}
                          {...getItemProps({
                            item,
                            index,
                            isActive: highlightedIndex === index,
                            isSelected: selectedItem === item,
                          })}
                        >
                          {item.text}
                        </Item>
                      ));
                    }}
                  </Suggest>
                );
              })()}
            </Menu>
          </div>
        </div>
      )}
    </Downshift>
  );
}
