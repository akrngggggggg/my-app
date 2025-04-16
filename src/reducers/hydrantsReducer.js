export const initialHydrantState = {
  hydrants: [],
  checkedList: [],
};

export const hydrantsReducer = (state, action) => {
  switch (action.type) {
    case "SET_ALL":
      return {
        ...state,
        hydrants: action.payload,
      };
    case "CHECK":
      return {
        ...state,
        hydrants: state.hydrants.map(h =>
          h.firestoreId === action.payload.id
            ? { ...h, checked: true, issue: action.payload.issue || null }
            : h
        ),
        checkedList: [...state.checkedList, action.payload.hydrant],
      };
    case "UNCHECK":
      return {
        ...state,
        hydrants: state.hydrants.map(h =>
          h.firestoreId === action.payload
            ? { ...h, checked: false, issue: null }
            : h
        ),
        checkedList: state.checkedList.filter(h => h.firestoreId !== action.payload),
      };
    case "RESET_ALL":
      return {
        ...state,
        hydrants: state.hydrants.map(h => ({ ...h, checked: false, issue: null })),
        checkedList: [],
      };
    default:
      return state;
  }
};
