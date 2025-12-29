
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, off, remove, update } from "firebase/database";
import { BillingRow, Unit, Resolution } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyCQfjFSY5CatgwlxzD6HQNvMa5giG8-11U",
  authDomain: "isaac-desconto.firebaseapp.com",
  databaseURL: "https://isaac-desconto-default-rtdb.firebaseio.com",
  projectId: "isaac-desconto",
  storageBucket: "isaac-desconto.appspot.com",
  messagingSenderId: "560256731452",
  appId: "1:560256731452:web:9a20d70b8c1c6523de3639"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const UNITS_PATH = 'units';

const slugify = (str: string) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

export const listenToAllUnitsData = (
  onData: (units: Unit[]) => void,
  onError: (error: Error) => void
) => {
  const unitsRef = ref(db, UNITS_PATH);
  const listener = onValue(unitsRef, (snapshot) => {
    const data = snapshot.val();
    const unitsList: Unit[] = data ? Object.keys(data).map(key => ({
      id: key,
      name: data[key].name,
      lastUpdated: data[key].lastUpdated,
      data: data[key].data || [],
      resolutions: data[key].resolutions || {}
    })) : [];
    onData(unitsList);
  }, (error) => {
    console.error("Firebase Units Read Error:", error);
    onError(error);
  });
  return () => off(unitsRef, 'value', listener);
};

export const saveUnitData = (unitId: string, unitName: string, data: BillingRow[]): Promise<void> => {
  const updates: { [key: string]: any } = {};
  updates[`${UNITS_PATH}/${unitId}/name`] = unitName;
  updates[`${UNITS_PATH}/${unitId}/lastUpdated`] = new Date().toISOString();
  updates[`${UNITS_PATH}/${unitId}/data`] = data;

  // By using update, we only touch these specific fields, leaving 'resolutions' untouched.
  return update(ref(db), updates);
};

export const saveStudentResolution = (unitId: string, studentName: string, note: string, errorType: 'date' | 'value'): Promise<void> => {
  const studentSlug = slugify(studentName);
  const resolutionRef = ref(db, `${UNITS_PATH}/${unitId}/resolutions/${studentSlug}/${errorType}`);
  const resolutionData: Resolution = {
    note: note,
    resolvedAt: new Date().toISOString()
  };
  return set(resolutionRef, resolutionData);
};


export const deleteUnit = (unitId: string): Promise<void> => {
    const unitRef = ref(db, `${UNITS_PATH}/${unitId}`);
    return remove(unitRef);
};