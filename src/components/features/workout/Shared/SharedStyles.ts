import { colors } from "../../../../theme/colors";
import { StyleSheet } from "react-native";

export const ITEM_HEIGHT = 80;
export const VISIBLE_ITEMS = 3;
export const SECONDS = Array.from({ length: 60 }, (_, i) => i);
export const REPS = Array.from({ length: 21 }, (_, i) => i);


export const styles = StyleSheet.create({

  // --- Section Layout ---
  sectionContainer: {
    width: '100%',
    marginTop: 12,
    padding: 8,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    paddingLeft: 4,
  },

  headerRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 4,
    alignItems: 'center',
  },

  headerText: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: colors.mainText,
    textTransform: 'uppercase',
  },

  inputRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 6,
    alignItems: 'center',
  },

  // --- Cells ---
  inputCell: {
    backgroundColor: colors.background,
    borderRadius: 8,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },

  inputText: {
    color: colors.mainText,
    fontWeight: '600',
    fontSize: 14,
  },

  exerciseInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    color: colors.mainText,
    fontSize: 14,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginHorizontal: 2,
    textAlign: 'center',
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },

  timePickerButton: {
    backgroundColor: colors.background,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
    marginHorizontal: 2,
  },

  timePickerText: {
    fontSize: 16,
    color: colors.mainText,
  },

  // --- Done Button ---
  // Background is transparent — the Feather icon provides all visual feedback.
  // ○ (circle)       = not done, muted
  // ✓ (check-circle) = done, highlighted
  // Components set flex inline; active/inactive opacity is also set inline.
  doneButton: {
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    backgroundColor: 'transparent',
  },

  doneButtonActive: {
    borderRadius: 8,
  },

  // Legacy text styles — no longer used in row done buttons but kept so any
  // remaining references (e.g. modals) don't break.
  doneButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.button2,
  },

  doneText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  dragIndicator: {
    width: 50,
    height: 4,
    backgroundColor: colors.button2,
    borderRadius: 2,
    marginBottom: 12,
  },

  // --- Delete ---
  smallDeleteButton: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },

  smallDeleteText: {
    color: colors.button2,
    fontWeight: 'bold',
    fontSize: 16,
  },

  // --- Modals ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: colors.container,
    borderRadius: 16,
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    width: '80%',
    maxHeight: 400,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: colors.button2,
  },

  searchInput: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 16,
    color: colors.mainText,
    marginBottom: 12,
  },

  pickerItemText: {
    fontSize: 28,
    fontWeight: '500',
    color: colors.mainText,
    textAlign: 'center',
    paddingVertical: 10,
  },

  sectionHeaderContainer: {
    backgroundColor: colors.background,
    borderRadius: 50,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignSelf: 'center',
    marginVertical: 4,
  },

  sectionHeaderText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.mainText,
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  exerciseRowItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.button1,
  },

  exerciseRowText: {
    fontSize: 18,
    color: colors.mainText,
  },

  cancelButtonContainer: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 32,
    backgroundColor: colors.button1,
    borderRadius: 12,
  },

  cancelButtonText: {
    color: colors.button2,
    fontWeight: 'bold',
    fontSize: 16,
  },

  // --- Wheel Picker ---
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  highlightOverlay: {
    position: 'absolute',
    width: '95%',
    height: ITEM_HEIGHT,
    backgroundColor: colors.button1,
    borderRadius: 20,
    zIndex: 0,
    opacity: 0.8,
  },

  wheel: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    width: 80,
  },

  wheelItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },

  wheelText: {
    fontSize: 32,
    color: colors.mainText,
    fontWeight: 'bold',
  },

  timeSeparator: {
    fontSize: 32,
    marginHorizontal: 12,
    color: colors.mainText,
  },

  doneButtonModal: {
    marginTop: 16,
    backgroundColor: colors.button1,
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 12,
  },

  // Legacy row done button — kept for any remaining references
  doneButtonRow: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    height: 30,
    marginHorizontal: 2,
    backgroundColor: 'transparent',
  },
  stepButton: {
  width: 60,
  height: 60,
  borderRadius: 30,
  backgroundColor: '#222',
  alignItems: 'center',
  justifyContent: 'center',
},

stepButtonText: {
  fontSize: 30,
  color: '#fff',
  fontWeight: 'bold',
},

stepperContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 20,
},

repsValue: {
  fontSize: 40,
  fontWeight: 'bold',
  color: colors.mainText,
},

stepButtonDisabled: {
  opacity: 0.3,
},

// --- Mode Toggle ---
modeToggle: {
  flexDirection: 'row',
  marginTop: 8,
  marginBottom: 2,
  gap: 4,
},

modePill: {
  flex: 1,
  paddingVertical: 5,
  borderRadius: 20,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.button2,
},

modePillActive: {
  // backgroundColor is set inline at the consumer using the active accent.
},

modePillText: {
  fontSize: 11,
  fontWeight: '700',
  color: colors.highlight,
  textTransform: 'uppercase',
  letterSpacing: 0.8,
},

modePillTextActive: {
  color: colors.background,
},

addWarmupButton: {
  backgroundColor: colors.container,
  paddingVertical: 2,
  paddingHorizontal: 10,
  borderRadius: 50,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 4,
  borderColor: colors.button3,
  alignSelf: 'flex-start',
  marginTop: 6,
  marginBottom: 2,
},

addWarmupText: {
  color: colors.button3,
  fontWeight: 'bold',
  fontSize: 11,
  textTransform: 'uppercase',
},

});