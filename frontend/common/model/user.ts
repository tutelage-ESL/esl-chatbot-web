export type User = {
  name: string;
  phoneNumber: string;
  profilePicture: string;
  balance: number;
  profile: {
    FirstName: string;
    LastName: string;
    Birthday: string;
    E_Mail: string;
    Gender: string;
    Country: any;
    State: any;
    AdvertisementLanguage: string;
  }
};
