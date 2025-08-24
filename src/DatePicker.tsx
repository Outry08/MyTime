import React, { useState } from "react";

export default function _DatePicker({ onDateChange, currDate }: { onDateChange: (date: string) => void, currDate: string }) {

  const [selectedDate, setSelectedDate] = useState(currDate);

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = event.target.value;
    setSelectedDate(newDate);
    onDateChange(newDate);
  };

  return <input type="date" className="input" value={selectedDate} onChange={handleDateChange} />;
}