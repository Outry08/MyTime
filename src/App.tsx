import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { Authenticator } from "@aws-amplify/ui-react";
import { getCurrentUser } from "@aws-amplify/auth";
import "@aws-amplify/ui-react/styles.css";
import _DatePicker from "./DatePicker";
import { useRef, ChangeEvent } from "react";
import { ThemeProvider, Theme } from '@aws-amplify/ui-react';

import { PieChart, Pie, Cell } from 'recharts';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const client = generateClient<Schema>();

function App() {

    const [loggedIn, setLoggedIn] = useState<boolean>(false);

    const [userName, setUserName] = useState<string>("Guest");
    const [userActivity, setActivities] = useState<Array<Schema["UserActivity"]["type"]>>([]);
    const [userHours, setHours] = useState<Array<Schema["UserHours"]["type"]>>([]);
    const [userDayHours, setDayHours] = useState<Array<Schema["UserHours"]["type"]>>([]);

    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');  // Months are 0-indexed, so add 1
    const day = String(date.getDate()).padStart(2, '0');  // Pad with 0 if day is single digit

    const [timeFrame, setTimeFrame] = useState(7); // Default to 7 days
    const [selectedActivities, setSelectedActivities] = useState<string[]>([]); // Chambungus

    const handleTimeFrameChange = (event: any) => {
        setTimeFrame(Number(event.target.value));
    };

    const formattedDate = `${year}-${month}-${day}`;

    const [selectedDate, setSelectedDate] = useState(formattedDate);

    const [activeTab, setActiveTab] = useState<string>("home");

    const inputUserNameRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        const fetchData = async () => {
            const currentUser = await getCurrentUser();

            client.models.User.observeQuery({
                filter: { UserID: { eq: currentUser.signInDetails?.loginId?.toString() } }
            }).subscribe({
                next: (data) => setUserName(data.items[0]?.Name ?? "Guest"),
            });
        };

        fetchData();

    }, [, loggedIn, activeTab]);

    useEffect(() => {
        if (inputUserNameRef.current) {
            inputUserNameRef.current.value = userName;
        }
    }, [userName, loggedIn, activeTab]);

    useEffect(() => {
        userActivity;

        const fetchData = async () => {
            const currentUser = await getCurrentUser();

            client.models.UserActivity.observeQuery({
                filter: { UserID: { eq: currentUser.signInDetails?.loginId } }
            }).subscribe({
                next: (data) => setActivities([...data.items]),
            });

        };

        fetchData();

    }, [, loggedIn, activeTab]);

    function updateHours() {
        const activityDropdown = document.getElementById('activityInput') as HTMLSelectElement;
        const hoursInput = document.getElementById('hoursInput') as HTMLInputElement;

        let activity = activityDropdown?.value;

        let activityHours = userDayHours.filter((val) => (val.ActivityName === activity && val.Date === selectedDate))[0];
        hoursInput.value = (activityHours ? activityHours.Hours : '0')
    };

    //list user activities
    useEffect(() => {

        const activitiesTable = document.getElementById('activityList');

        if (activitiesTable) {
            activitiesTable.innerHTML = '';
        }

        userActivity.forEach(activity => {

            const tableRow = document.createElement('tr');

            let tdP = document.createElement('td');
            const ulP = document.createElement('ul');
            ulP.className = 'listActivityName';
            const activityName = document.createElement('li');
            activityName.textContent = activity.ActivityName;
            activityName.id = 'name' + activity.ActivityName;
            ulP.appendChild(activityName)
            tdP.appendChild(ulP);
            tableRow.appendChild(tdP);

            // listItem.textContent = activity.ActivityName;

            const timeInput = document.createElement('input');
            timeInput.id = 'timepicker' + activity.ActivityName;
            timeInput.className = "updateTimePickers input";
            timeInput.innerHTML = "<img src='clock.png' alt='Time'>";
            timeInput.maxLength = 5;

            let activityHours = userDayHours.filter((val) => (val.ActivityName === activity.ActivityName && val.Date === selectedDate))[0];
            timeInput.value = (activityHours ? activityHours.Hours : '0');

            timeInput.onchange = () => {
                let button = document.getElementById('save' + activity.ActivityName) as HTMLButtonElement;
                button.style = 'color:red; font-style:italic';
            }

            const colorPicker = document.createElement('input');
            colorPicker.type = 'color';
            colorPicker.id = 'colorpicker' + activity.ActivityName;
            colorPicker.className = 'updateColorPickers';
            colorPicker.value = activity.ActivityColor;
            colorPicker.onchange = () => {
                let button = document.getElementById('save' + activity.ActivityName) as HTMLButtonElement;
                button.style = 'color:red; font-style:italic';
            }

            const saveButton = document.createElement('button');
            saveButton.textContent = 'Save';
            saveButton.id = 'save' + activity.ActivityName;
            saveButton.className = 'activitySave';

            saveButton.onclick = async () => {
                const currentUser = await getCurrentUser();

                const uid = String(currentUser.signInDetails?.loginId);

                let colorField = document.getElementById('colorpicker' + activity.ActivityName) as HTMLInputElement;
                let timeInput = document.getElementById('timepicker' + activity.ActivityName) as HTMLInputElement;
                let activityColor = colorField?.value;
                let activityTime = timeInput?.value;

                let success = true;

                //White color check
                const warningElement = document.getElementById("whiteColorWarning");
                if (activityColor == "#ffffff") {
                    if (warningElement) {
                        warningElement.style.display = "block";
                    }
                    success = false;
                } else {
                    if (warningElement) {
                        warningElement.style.display = "none";
                    }

                    await client.models.UserActivity.update({ UserID: uid, ActivityName: activity.ActivityName, ActivityColor: activityColor });
                }

                const totalHoursWarning = document.getElementById("totalHoursWarning");
                if (activityTime != null && parseFloat(activityTime) > 0) {
                    let totalHours = 0;
                    userDayHours.forEach(activity => {
                        totalHours += Number(activity.Hours)
                    });

                    if (activityHours != null) {
                        if (totalHours + parseFloat(activityTime) - parseFloat(activityHours.Hours) > 24) {
                            if (totalHoursWarning)
                                totalHoursWarning.style = 'display:block';
                            success = false;
                        }
                        else {
                            if (totalHoursWarning)
                                totalHoursWarning.style = 'display:none';

                            await client.models.UserHours.update({ UserID: uid, ActivityName_Date: activity.ActivityName + " | " + selectedDate, Hours: activityTime });
                        }
                    } else {
                        if (totalHours + parseFloat(activityTime) > 24) {
                            if (totalHoursWarning)
                                totalHoursWarning.style = 'display:block';
                            success = false;
                        }
                        else {
                            if (totalHoursWarning)
                                totalHoursWarning.style = 'display:none';

                            await client.models.UserHours.create({ UserID: uid, ActivityName: activity.ActivityName, Date: selectedDate, ActivityName_Date: activity.ActivityName + " | " + selectedDate, Hours: activityTime });
                        }
                    }
                }
                else {
                    if (totalHoursWarning)
                        totalHoursWarning.style = 'display:none';
                    await client.models.UserHours.delete({ UserID: uid, ActivityName_Date: activity.ActivityName + " | " + selectedDate });
                }

                if (success) {
                    let button = document.getElementById('save' + activity.ActivityName) as HTMLButtonElement;
                    button.style = 'color:green; font-style:normal';
                }
            };

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.id = 'delete' + activity.ActivityName;
            deleteButton.className = 'activityDelete';

            deleteButton.onclick = async () => {
                const currentUser = await getCurrentUser();

                const uid = String(currentUser.signInDetails?.loginId);

                client.models.UserHours.observeQuery({
                    filter: { UserID: { eq: uid }, ActivityName: { eq: activity.ActivityName } }
                }).subscribe({
                    next: async (data) => {
                        for (const entry of data.items) {
                            console.log("DELETING UH:", entry.UserID, entry.ActivityName_Date)
                            await client.models.UserHours.delete({
                                UserID: entry.UserID,
                                ActivityName_Date: entry.ActivityName_Date
                            });
                        }
                    }
                });

                console.log("DELETING UA:", uid, activity.ActivityName);
                await client.models.UserActivity.delete({ UserID: uid, ActivityName: activity.ActivityName })


            };

            let tdT = document.createElement('td');
            tdT.appendChild(timeInput);
            tableRow.appendChild(tdT);

            let tdC = document.createElement('td');
            tdC.appendChild(colorPicker);
            tableRow.appendChild(tdC);

            let tdS = document.createElement('td');
            tdS.appendChild(saveButton);
            tableRow.appendChild(tdS);

            let tdD = document.createElement('td');
            tdD.appendChild(deleteButton);
            tableRow.appendChild(tdD);

            if (activitiesTable) {
                activitiesTable.appendChild(tableRow);
            }
        });

    }, [userActivity, loggedIn, activeTab, userDayHours]);

    useEffect(() => {
        userHours;

        const fetchData = async () => {
            const currentUser = await getCurrentUser();

            client.models.UserHours.observeQuery({
                filter: { UserID: { eq: currentUser.signInDetails?.loginId?.toString() } }
            }).subscribe({
                next: (data) => setHours([...data.items]),
            });
        };

        fetchData();

    }, [, loggedIn, activeTab]);

    useEffect(() => {
        userDayHours;

        const fetchData = async () => {
            const currentUser = await getCurrentUser();

            client.models.UserHours.observeQuery({
                filter: { UserID: { eq: currentUser.signInDetails?.loginId?.toString() }, Date: { eq: selectedDate.toString() } }
            }).subscribe({
                next: (data) => setDayHours([...data.items]),
            });
        };

        fetchData();

    }, [, selectedDate, loggedIn, activeTab]);

    useEffect(() => {

        let totalHours = 0;
        const totalHoursText = document.getElementById('totalHours');

        userDayHours.forEach(activity => {
            totalHours += Number(activity.Hours)
            if (totalHoursText) {
                totalHoursText.innerHTML = `Filled In ${totalHours}/24hrs`;
            }
        });

    }, [, userDayHours, loggedIn, activeTab]);



    async function db_insertActivity() {
        let nameField = document.getElementById('activityNameInput') as HTMLInputElement
        let activityName = nameField?.value;

        let colorField = document.getElementById('colorpicker') as HTMLInputElement;
        let activityColor = colorField?.value;

        const currentUser = await getCurrentUser();
        const uid = String(currentUser.signInDetails?.loginId);
        const noActivityNameWarning = document.getElementById("noActivityNameWarning");

        if (activityName != null && activityName != '') {
            const warningElement = document.getElementById("whiteColorWarning");

            if (noActivityNameWarning)
                noActivityNameWarning.style = 'display:none';

            if (activityColor == "#ffffff") {
                if (warningElement) {
                    warningElement.style.display = "block";
                }
            } else {
                if (warningElement) {
                    warningElement.style.display = "none";
                }
                client.models.UserActivity.create({ UserID: uid, ActivityName: activityName, ActivityColor: activityColor })
                expandPlus();
            }
        }
        else
            if (noActivityNameWarning)
                noActivityNameWarning.style = 'display:block';
    }

    async function db_insertHours() {

        let totalHours = 0;
        userDayHours.forEach(activity => {
            totalHours += Number(activity.Hours)
        });

        let nameField = document.getElementById('activityInput') as HTMLInputElement;
        let activityName = nameField.value;

        let hoursField = document.getElementById('hoursInput') as HTMLInputElement;
        let hours = hoursField.value;

        let date = selectedDate;

        const currentUser = await getCurrentUser();
        const uid = String(currentUser.signInDetails?.loginId);

        const noActivityWarning = document.getElementById("noActivityWarning");
        if (activityName == '' || activityName == null) {
            if (noActivityWarning)
                noActivityWarning.style = 'display:block';
            return;
        }

        if (noActivityWarning)
            noActivityWarning.style = 'display:none';

        let activityHours = userDayHours.filter((val) => (val.ActivityName === activityName && val.Date === selectedDate))[0];
        if (activityHours != null) {

            const totalHoursWarning = document.getElementById("totalHoursWarning");
            if (totalHours + parseFloat(hours) - parseFloat(activityHours.Hours) > 24) {
                if (totalHoursWarning)
                    totalHoursWarning.style = 'display:block';
                return;
            }

            if (totalHoursWarning)
                totalHoursWarning.style = 'display:none';

            if (parseFloat(hours) <= 0 || hours == '' || hours == null) {
                await client.models.UserHours.delete({ UserID: uid, ActivityName_Date: activityName + " | " + selectedDate });
            }

            await client.models.UserHours.update({ UserID: uid, ActivityName_Date: activityName + " | " + selectedDate, Hours: hours });
        } else {

            const totalHoursWarning = document.getElementById("totalHoursWarning");
            if (totalHours + parseFloat(hours) > 24) {
                if (totalHoursWarning)
                    totalHoursWarning.style = 'display:block';
                return;
            }

            if (totalHoursWarning)
                totalHoursWarning.style = 'display:none';

            const negativeHoursWarning = document.getElementById("negativeHoursWarning");
            if (parseFloat(hours) <= 0 || hours == '' || hours == null) {
                if (negativeHoursWarning)
                    negativeHoursWarning.style = 'display:block';
                return;
            }

            if (negativeHoursWarning)
                negativeHoursWarning.style = 'display:none';

            await client.models.UserHours.create({ UserID: uid, Date: date, ActivityName: activityName, Hours: hours, ActivityName_Date: (activityName + " | " + date) });
        }

        MyChart();
    }

    function db_addToDropDown() {
        let activityDropDown = document.getElementById('activityInput') as HTMLSelectElement;
        let selectedValue = activityDropDown.value;

        let html = "";
        userActivity.forEach(function (value) {
            html += `<option value='${value.ActivityName}'>${value.ActivityName}</option>`
        });

        if (html != "") {
            activityDropDown.innerHTML = html;
        }
        else {
            activityDropDown.innerHTML = "<option value=''>Create an activity</option>";
        }

        if ([...activityDropDown.options].some(option => option.value === selectedValue)) {
            activityDropDown.value = selectedValue;
        }
    }

    async function db_insertName() {

        let name = String((document.getElementById('nameInput') as HTMLInputElement).value);

        const currentUser = await getCurrentUser();
        const uid = String(currentUser.signInDetails?.loginId);
        const existingUser = await client.models.User.get({ UserID: uid });
        if (existingUser.data != null) {
            // Update the existing user's name
            await client.models.User.update({ UserID: uid, Name: name });
        } else {
            // Create a new user with the given ID and name
            await client.models.User.create({ UserID: uid, Name: name });
        }
    }

    function expandPlus() {
        const plusElement = document.getElementById("addElement");
        const formElement = document.getElementById("newActivityForm");

        if (plusElement && formElement) {
            if (plusElement.innerText == "+") {
                formElement.style = "margin-bottom:20px";

                formElement.innerHTML = `<p class='actionHeader'>Create a new activity: </p><div class='activityNameContainer menuContainer'><p>Name: </p><input id=\"activityNameInput\" class='input'></div>
          <div class='activityColorContainer'>
              <div id="colorPicker"> <p class="centeredText">Colour: </p><input type=\"color\" id=\"colorpicker\"></div>
              <button id='submitActivity' class='input'>Add Activity</button>
          </div>`;
                plusElement.innerText = '-';
                document.getElementById("submitActivity")?.addEventListener('click', db_insertActivity);
            }
            else if (plusElement.innerText == "-") {
                formElement.style = "margin-bottom:0";
                formElement.innerHTML = '';
                plusElement.innerText = '+';
            }
        }
    }

    function MyChart() {

        let chartVals = userHours.filter((val) => (
            val.Date === selectedDate
        ));

        console.log(chartVals);
        let activityColorMap = [];
        let data2 = [];
        let totalHours = 0;

        for (let j = 0; j < chartVals.length; j++) {
            for (let i = 0; i < userActivity.length; i++) {
                if (userActivity[i].ActivityName == chartVals[j].ActivityName) {
                    let name = chartVals[j].ActivityName?.toString();
                    let hours = parseFloat(chartVals[j].Hours);
                    totalHours += hours;
                    let color = userActivity[i].ActivityColor?.toString();

                    activityColorMap.push({ name, color });
                    data2.push({ name: name, value: hours });
                }
            }
        };

        if (totalHours < 24) {
            activityColorMap.push({ name: "", color: "#FFFFFF" })
            data2.push({ name: "", value: 24 - totalHours })
        }

        if (data2.length == 0) {
            //basic white chart if no data
            return (
                <PieChart width={550} height={450}>
                    <Pie data={[{ name: "Nothing", value: 24 }]}
                        dataKey="value"
                        nameKey="name"
                        cx='50%' cy='50%'
                        outerRadius={150}
                        fill='#FFFFFF'
                        style={{ outline: "none" }}>
                        {data2.map((_, index) => (
                            <Cell key={index} fill={activityColorMap[index % activityColorMap.length].color} />
                        ))}
                    </Pie>
                </PieChart>
            )
        }

        return (
            //Actual data pie chart unlike one above (\u00A0 whitespace)
            <PieChart width={600} height={450}>
                <Pie data={data2}
                    dataKey="value"
                    nameKey="name"
                    cx='50%' cy='50%'
                    outerRadius={150}
                    fill='#8884d8'
                    stroke="#000000"
                    strokeWidth={2}
                    style={{ outline: "none", fontSize: '14px' }}
                    label={({ name, value }) => `${name}: ${value}hrs`}>
                    {data2.map((_, index) => (
                        <Cell key={index} fill={activityColorMap[index % activityColorMap.length].color} />
                    ))}
                </Pie>
            </PieChart>
        )
    }

    function getPreviousDay(dateString: string) {
        const date = new Date(dateString + 'T00:00:00Z');
        date.setDate(date.getDate() - 1);

        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    function getAllDataXDays(numDays: number) {
        let currentDate = selectedDate;

        let dataOverDays = [];
        for (let i = 0; i < numDays; i++) {
            let data = getXDay(currentDate);

            currentDate = getPreviousDay(currentDate);

            dataOverDays.push(data);
        }

        return dataOverDays;
    }

    function getXDay(date: string) {

        const entry = userHours.filter((val) => (val.Date === date))

        const mergedEntries = entry.map((val) => {
            // Find the matching userActivity entry based on ActivityName
            const matchingActivity = userActivity.find(activity => activity.ActivityName === val.ActivityName);

            // Merge the two objects (combine val and matchingActivity)
            return {
                ...val, // All properties from the entry
                ...matchingActivity, // All properties from the matching activity
            };
        });

        console.log("MU", mergedEntries);

        return mergedEntries;

        //Old Code
        // return (userHours.filter((val) => (
        //     val.Date === date
        // )));
    }

    function sumAllDataXDays(numDays: number) {
        let dataOverDays = getAllDataXDays(numDays);
        // let activityDict = {};
        const activityDict: { [key: string]: number } = {}
        let totalHours = 0;

        for (let i = 0; i < numDays; i++) {
            for (let j = 0; j < dataOverDays[i].length; j++) {
                if (dataOverDays[i][j].ActivityName in activityDict) {
                    activityDict[dataOverDays[i][j].ActivityName] += parseFloat(dataOverDays[i][j].Hours);
                }
                else {
                    activityDict[dataOverDays[i][j].ActivityName] = parseFloat(dataOverDays[i][j].Hours);
                }

                totalHours += parseFloat(dataOverDays[i][j].Hours);
            }
        }

        const sortedActivityDict = Object.entries(activityDict).sort((a, b) => b[1] - a[1]);

        if (Object.keys(sortedActivityDict).length >= 5) {
            return <tbody>
                <tr id="top_head">
                    <td>Activity</td>
                    <td>Hours</td>
                    <td>Percentage</td>
                </tr>
                <tr id="top_1">
                    <td>{sortedActivityDict[0][0]}</td>
                    <td>{sortedActivityDict[0][1]}</td>
                    <td>{(sortedActivityDict[0][1] / totalHours * 100).toFixed(2)}</td>
                </tr>
                <tr id="top_2">
                    <td>{sortedActivityDict[1][0]}</td>
                    <td>{sortedActivityDict[1][1]}</td>
                    <td>{(sortedActivityDict[1][1] / totalHours * 100).toFixed(2)}</td>
                </tr>
                <tr id="top_3">
                    <td>{sortedActivityDict[2][0]}</td>
                    <td>{sortedActivityDict[2][1]}</td>
                    <td>{(sortedActivityDict[2][1] / totalHours * 100).toFixed(2)}</td>
                </tr>
                <tr id="top_4">
                    <td>{sortedActivityDict[3][0]}</td>
                    <td>{sortedActivityDict[3][1]}</td>
                    <td>{(sortedActivityDict[3][1] / totalHours * 100).toFixed(2)}</td>
                </tr>
                <tr id="top_5">
                    <td>{sortedActivityDict[4][0]}</td>
                    <td>{sortedActivityDict[4][1]}</td>
                    <td>{(sortedActivityDict[4][1] / totalHours * 100).toFixed(2)}</td>
                </tr>
            </tbody>
        }
        else if (Object.keys(sortedActivityDict).length >= 4) {
            return <tbody>
                <tr id="top_head">
                    <td>Activity</td>
                    <td>Hours</td>
                    <td>Percentage</td>
                </tr>
                <tr id="top_1">
                    <td>{sortedActivityDict[0][0]}</td>
                    <td>{sortedActivityDict[0][1]}</td>
                    <td>{(sortedActivityDict[0][1] / totalHours * 100).toFixed(2)}</td>
                </tr>
                <tr id="top_2">
                    <td>{sortedActivityDict[1][0]}</td>
                    <td>{sortedActivityDict[1][1]}</td>
                    <td>{(sortedActivityDict[1][1] / totalHours * 100).toFixed(2)}</td>
                </tr>
                <tr id="top_3">
                    <td>{sortedActivityDict[2][0]}</td>
                    <td>{sortedActivityDict[2][1]}</td>
                    <td>{(sortedActivityDict[2][1] / totalHours * 100).toFixed(2)}</td>
                </tr>
                <tr id="top_4">
                    <td>{sortedActivityDict[3][0]}</td>
                    <td>{sortedActivityDict[3][1]}</td>
                    <td>{(sortedActivityDict[3][1] / totalHours * 100).toFixed(2)}</td>
                </tr>
            </tbody>
        }
        else if (Object.keys(sortedActivityDict).length >= 3) {
            return <tbody>
                <tr id="top_head">
                    <td>Activity</td>
                    <td>Hours</td>
                    <td>Percentage</td>
                </tr>
                <tr id="top_1">
                    <td>{sortedActivityDict[0][0]}</td>
                    <td>{sortedActivityDict[0][1]}</td>
                    <td>{(sortedActivityDict[0][1] / totalHours * 100).toFixed(2)}</td>
                </tr>
                <tr id="top_2">
                    <td>{sortedActivityDict[1][0]}</td>
                    <td>{sortedActivityDict[1][1]}</td>
                    <td>{(sortedActivityDict[1][1] / totalHours * 100).toFixed(2)}</td>
                </tr>
                <tr id="top_3">
                    <td>{sortedActivityDict[2][0]}</td>
                    <td>{sortedActivityDict[2][1]}</td>
                    <td>{(sortedActivityDict[2][1] / totalHours * 100).toFixed(2)}</td>
                </tr>
            </tbody>
        }
        else if (Object.keys(sortedActivityDict).length >= 2) {
            return <tbody>
                <tr id="top_head">
                    <td>Activity</td>
                    <td>Hours</td>
                    <td>Percentage</td>
                </tr>
                <tr id="top_1">
                    <td>{sortedActivityDict[0][0]}</td>
                    <td>{sortedActivityDict[0][1]}</td>
                    <td>{(sortedActivityDict[0][1] / totalHours * 100).toFixed(2)}</td>
                </tr>
                <tr id="top_2">
                    <td>{sortedActivityDict[1][0]}</td>
                    <td>{sortedActivityDict[1][1]}</td>
                    <td>{(sortedActivityDict[1][1] / totalHours * 100).toFixed(2)}</td>
                </tr>
            </tbody>
        }
        else if (Object.keys(sortedActivityDict).length == 1) {
            return <tbody>
                <tr id="top_head">
                    <td>Activity</td>
                    <td>Hours</td>
                    <td>Percentage</td>
                </tr>
                <tr id="top_1">
                    <td>{sortedActivityDict[0][0]}</td>
                    <td>{sortedActivityDict[0][1]}</td>
                    <td>{(sortedActivityDict[0][1] / totalHours * 100).toFixed(2)}</td>
                </tr>
            </tbody>
        }
        else {
            return <tbody>
                <tr id="top_head">
                    <td>Activity</td>
                    <td>Hours</td>
                    <td>Percentage</td>
                </tr>
            </tbody>
        }

    }

    function createTimeChartFromData(data: any) {
        let totalData: Record<string, number[]> = {};
        let totalDays = data.length;

        const reversedData = [...data].reverse();

        for (let i = 0; i < totalDays; i++) {
            if (reversedData[i] && reversedData[i].length > 0) {
                for (let j = 0; j < reversedData[i].length; j++) {
                    let activityName = reversedData[i][j].ActivityName;
                    if (!totalData[activityName]) {
                        totalData[activityName] = new Array(totalDays).fill(0);
                    }
                }
            }
        }

        for (let i = 0; i < totalDays; i++) {
            if (i > 0) {
                for (let activity in totalData) {
                    totalData[activity][i] = totalData[activity][i - 1];
                }
            }

            if (reversedData[i] && reversedData[i].length > 0) {
                for (let j = 0; j < reversedData[i].length; j++) {
                    let activityName = reversedData[i][j].ActivityName;
                    let hours = parseFloat(reversedData[i][j].Hours) || 0;

                    totalData[activityName][i] += hours;
                }
            }
        }

        return totalData;
    }

    function comparisonOverTimeLineChart(days: number) {

        console.log(selectedActivities);

        let rawData = createTimeChartFromData(getAllDataXDays(days));
        let data: any[] = [];

        for (let i = 0; i < days; i++) {
            let tempObj: Record<string, any> = {};
            tempObj["name"] = "Day " + i.toString();
            for (let key in rawData) {
                if (selectedActivities.includes(key)) {
                    tempObj[key] = rawData[key][i];
                }
            }
            data.push(tempObj);
        }

        const lines = Object.keys(rawData)
            .filter((key) => selectedActivities.includes(key))
            .map((key) => (
                <Line key={key} type="monotone" dataKey={key} stroke={getColorOfActivity(key)} />
            ));

        return (
            <LineChart width={500} height={300} data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                {lines}
            </LineChart>
        );
    }

    const handleCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = event.target;

        setSelectedActivities((prev: any) => {
            if (checked) {
                return [...prev, value];
            } else {
                return prev.filter((activity: any) => activity !== value);
            }
        });
    }

    function buildActivitiesSelectLineChart() {
        return (
            <ul>
                {userActivity.map((activity) => (
                    <li key={activity.ActivityName} value={activity.ActivityName}>
                        {activity.ActivityName}
                        <input
                            type="checkbox"
                            id={activity.ActivityName}
                            name={activity.ActivityName}
                            value={activity.ActivityName}
                            onChange={handleCheckboxChange}
                        />
                    </li>
                ))}
            </ul>
        );
    }

    function getColorOfActivity(activityName: string) {
        return userActivity.filter((val) => val.ActivityName === activityName)[0].ActivityColor;
    }

    const theme: Theme = {
        name: 'CustomTheme',
        tokens: {
            colors: {
                brand: {
                    primary: { value: '#000000' }, // Change primary color
                    secondary: { value: '#000000' },
                },
            },
            components: {
                button: {
                    primary: {
                        backgroundColor: { value: '#00aaff' },
                        color: { value: '#ffffff' },
                        _hover: { backgroundColor: { value: '#8ed8ff' } },
                    },
                    link: {
                        color: { value: '#000000' },
                        _hover: { color: { value: '#ffffff' }, backgroundColor: { value: '#000000' } },
                    },
                },
                tabs: {
                    item: {
                        borderColor: { value: '#000000' },
                        color: { value: '#000000' }, // Tab text color (default state)
                        _hover: {
                            borderColor: { value: '#00aaff' },
                            color: { value: '#00aaff' },
                        }, // Tab text on hover
                        _active: {
                            borderColor: { value: '#00aaff' },
                            color: { value: '#00aaff' }, // Active tab text color
                            backgroundColor: { value: '#ffffff' }, // Active tab background
                        },
                    },
                },
            },
        },
    };

    return (
        <>
            <ThemeProvider theme={theme}>

                <Authenticator components={{
                    Header: () => (
                        <div id="logoContainer">
                            <img src="https://dinosaurbooket-dev.s3.us-east-2.amazonaws.com/clockIcon.png" id="logo"></img>
                            <p id="time">
                                MyTime
                            </p>
                        </div>)
                }}>
                    {({ signOut, user }) => {
                        if (user && !loggedIn) {
                            setLoggedIn(true); // Update state when user logs in
                        }
                        return (
                            <main id="theMain">
                                <ul className="header">
                                    <li className={activeTab === "home" ? "active" : ""} onClick={() => setActiveTab("home")}>
                                        HOME
                                    </li>
                                    <li className={activeTab === "summary" ? "active" : ""} onClick={() => setActiveTab("summary")}>
                                        SUMMARY
                                    </li>
                                    <li>
                                        <button id="nameSubmit" className="input" onClick={() => db_insertName()}>Set Display Name</button>
                                        <input id="nameInput" className="input" ref={inputUserNameRef}></input>
                                    </li>
                                    <li>
                                        <button id="signOut" className="input" onClick={signOut}>Sign Out</button>
                                    </li>
                                </ul>
                                {activeTab === "home" && (
                                    <section id="main-content">
                                        <aside>
                                            <div>
                                                <h3>Welcome {userName}!</h3>
                                                <h3>Enter Data</h3>
                                            </div>
                                            <div className="datepickerContainer menuContainer">
                                                <p>
                                                    Date:
                                                </p>
                                                <_DatePicker onDateChange={setSelectedDate} currDate={selectedDate} />
                                            </div>
                                            <div className="activityContainer menuContainer">
                                                <p>
                                                    Activity:
                                                </p>
                                                <select id="activityInput" onClick={db_addToDropDown} onChange={updateHours} className="input">
                                                    <option value="">Activity</option>
                                                </select>
                                                <div id="addElement" className="input" onClick={expandPlus}>+</div>
                                            </div>
                                            <div id="newActivityForm"></div>
                                            <div className="hoursInputContainer menuContainer">
                                                <p>Hours: </p>
                                                <input id="hoursInput" className="input" maxLength={5}></input>
                                            </div>
                                            <div id="submit" className="input" onClick={() => db_insertHours()}>
                                                Submit
                                            </div>
                                            <p id="whiteColorWarning" className="warningMessage">No White Color!!!</p>
                                            <p id="totalHoursWarning" className="warningMessage">Total hours cannot exceed 24!!!</p>
                                            <p id="negativeHoursWarning" className="warningMessage">Hours must be greater than 0!!!</p>
                                            <p id="noActivityWarning" className="warningMessage">No activity selected!!!</p>
                                            <p id="noActivityNameWarning" className="warningMessage">No activity name entered!!!</p>
                                            <div>
                                                {/* here */}
                                                <h3>My Activities</h3>
                                                <ul id="activityList">

                                                </ul>
                                            </div>
                                        </aside>
                                        <main>
                                            <h3>Day: {selectedDate}</h3>
                                            <h3 id="totalHours">0/24</h3>
                                            <div id="MainGraph">{MyChart()}</div>
                                        </main>
                                    </section>
                                )}

                                {activeTab === "summary" && (
                                    <section id="main-content-section">
                                        <div id="summaryHeader">
                                            <h3>Timeframe</h3>
                                            <select id="timeFrameSelect"
                                                className="input"
                                                value={timeFrame}
                                                onChange={handleTimeFrameChange}
                                            >
                                                <option value="1">Day</option>
                                                <option value="7">Week</option>
                                                <option value="30">Month</option>
                                                <option value="365">Year</option>
                                            </select>
                                        </div>
                                        <section id="widgets">
                                            <div id="topActivities" className="widget">
                                                <h3>Top Activities</h3>
                                                <table>
                                                    {sumAllDataXDays(timeFrame)}
                                                </table>
                                            </div>
                                            <div id="timeFrame" className="widget">
                                                <h3>Comparison over Time</h3>
                                                {comparisonOverTimeLineChart(timeFrame)}
                                                {buildActivitiesSelectLineChart()}
                                            </div>
                                        </section>
                                    </section>
                                )}
                            </main>
                        )
                    }
                    }
                </Authenticator>
            </ThemeProvider>
        </>
    );
}

export default App;

